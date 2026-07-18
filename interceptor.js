// Runs in the page's MAIN world. Patches fetch/XHR so we can read the JSON
// responses X's own web app receives. When the user opens an "About this
// account" panel, the response carries the verified "account based in"
// country — harvest it for free so we never re-fetch it ourselves.
(() => {
  console.log("[X Location Checker] interceptor loaded (MAIN world)");

  function emit(screenName, country, queryId, opName) {
    window.postMessage(
      { type: "tcb-about", screenName, country, queryId, opName },
      window.location.origin
    );
  }

  // Depth-first search for the based-in country string in a GraphQL payload.
  function findBasedIn(node, depth) {
    if (!node || typeof node !== "object" || depth > 25) return null;
    for (const [key, value] of Object.entries(node)) {
      if (
        /account_based_in|based_in_country|country_of_origin/i.test(key) &&
        typeof value === "string" &&
        value.length > 0 &&
        value.length < 80
      ) {
        return value;
      }
    }
    for (const value of Object.values(node)) {
      const found = findBasedIn(value, depth + 1);
      if (found) return found;
    }
    return null;
  }

  function findScreenName(node, depth) {
    if (!node || typeof node !== "object" || depth > 25) return null;
    const direct =
      (node.legacy && node.legacy.screen_name) ||
      (node.core && node.core.screen_name) ||
      node.screen_name;
    if (typeof direct === "string") return direct;
    for (const value of Object.values(node)) {
      const found = findScreenName(value, depth + 1);
      if (found) return found;
    }
    return null;
  }

  function process(url, text) {
    if (typeof url !== "string") return;
    if (!/\/i\/api\/graphql\/[^/]+\/[^?]*About/i.test(url)) return;
    if (!text || text[0] !== "{") return;
    try {
      const json = JSON.parse(text);
      const country = findBasedIn(json, 0);
      let screenName = findScreenName(json, 0);
      if (!screenName) {
        // Fall back to the screenName in the request variables.
        const match = url.match(/variables=([^&]+)/);
        if (match) {
          try {
            const vars = JSON.parse(decodeURIComponent(match[1]));
            screenName = vars.screenName || vars.screen_name || null;
          } catch {
            /* ignore */
          }
        }
      }
      if (screenName) {
        const endpoint = url.match(/\/i\/api\/graphql\/([\w-]+)\/(\w+)/);
        console.log(
          `[X Location Checker] harvested About endpoint: ${endpoint ? endpoint[1] + "/" + endpoint[2] : url}`
        );
        emit(
          screenName.toLowerCase(),
          country || "",
          endpoint ? endpoint[1] : undefined,
          endpoint ? endpoint[2] : undefined
        );
      }
    } catch {
      /* not JSON — ignore */
    }
  }

  const origFetch = window.fetch;
  window.fetch = function (...args) {
    return origFetch.apply(this, args).then((response) => {
      try {
        const url =
          typeof args[0] === "string" ? args[0] : args[0] && args[0].url;
        if (url && /\/i\/api\//.test(url)) {
          response
            .clone()
            .text()
            .then((text) => process(url, text))
            .catch(() => {});
        }
      } catch {
        /* never break the page's own request */
      }
      return response;
    });
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__tcbUrl = url;
    return origOpen.call(this, method, url, ...rest);
  };
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", () => {
      try {
        if (this.responseType === "" || this.responseType === "text") {
          process(this.__tcbUrl, this.responseText);
        }
      } catch {
        /* ignore */
      }
    });
    return origSend.apply(this, args);
  };
})();
