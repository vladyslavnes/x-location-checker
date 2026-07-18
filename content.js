// Isolated-world content script. For every user name visible in the UI it
// resolves the X-verified "Account based in" country (the same data shown on
// x.com/<user>/about) and injects a flag badge next to the name.
//
// Data sources, in order of preference:
//   1. Persistent cache (chrome.storage.local) — country rarely changes.
//   2. Passive harvest: interceptor.js forwards About-panel responses the
//      user's own browsing produces.
//   3. Active fetch: a paced queue calls the same AboutAccountQuery GraphQL
//      endpoint X's web app uses, authenticated by the user's own session.
(() => {
  console.log("[X Location Checker] content script loaded");

  const BEARER =
    "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
  const CACHE_KEY = "tcbAboutCache";
  const QID_KEY = "tcbQueryInfo";
  const FEATURES_KEY = "tcbFeatures";
  const CACHE_MAX = 8000;
  const FETCH_GAP_MS = 1500;
  const QID_TTL_MS = 24 * 60 * 60 * 1000;
  const OPERATION_NAMES = [
    "AboutAccountQuery",
    "AboutThisAccountQuery",
    "ProfileAboutQuery",
    "AccountBasedInQuery",
  ];

  // handle -> country string ("" = checked, none available)
  const countryByHandle = new Map();
  const inFlight = new Set();
  const queue = []; // LIFO so freshly visible users win
  let cacheDirty = false;
  let learnedFeatures = {};
  let queryInfo = null; // { id, name, ts }
  let queryDiscoveryFailed = false;
  let pausedUntil = 0;
  let pumping = false;
  // Live quota state from X's rate-limit headers; lets us spend the 15-min
  // window evenly instead of bursting into a 429.
  let rateRemaining = null;
  let rateResetMs = 0;
  let displayMode = "both"; // "flag" | "text" | "both"
  let placement = "button"; // "name" | "date" | "button"
  let gdpSizing = false;
  let tierMode = "builtin"; // "builtin" | "custom"
  let customTiers = { map: {}, defaultScale: 1 };

  const SETTING_DEFAULTS = {
    displayMode: "both",
    placement: "button",
    gdpSizing: false,
    tierMode: "builtin",
    customTiers: { map: {}, defaultScale: 1 },
  };

  chrome.storage.sync.get(SETTING_DEFAULTS, (settings) => {
    displayMode = settings.displayMode;
    placement = settings.placement;
    // "hover" existed in older versions — fold it into the default.
    if (!["name", "date", "button"].includes(placement)) placement = "button";
    gdpSizing = settings.gdpSizing;
    tierMode = settings.tierMode;
    customTiers = settings.customTiers;
    decorateAll();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (!Object.keys(SETTING_DEFAULTS).some((key) => key in changes)) return;
    if (changes.displayMode) displayMode = changes.displayMode.newValue;
    if (changes.placement) placement = changes.placement.newValue;
    if (changes.gdpSizing) gdpSizing = changes.gdpSizing.newValue;
    if (changes.tierMode) tierMode = changes.tierMode.newValue;
    if (changes.customTiers) customTiers = changes.customTiers.newValue;
    if (!["name", "date", "button"].includes(placement)) placement = "button";
    for (const el of document.querySelectorAll(".tcb-badge, .tcb-check")) {
      el.remove();
    }
    for (const el of document.querySelectorAll("[data-tcb-scaled]")) {
      delete el.dataset.tcbScaled;
      el.style.removeProperty("--tcb-scale");
    }
    decorateAll();
  });

  // ---------------------------------------------------------------- cache
  chrome.storage.local.get([CACHE_KEY, QID_KEY, FEATURES_KEY], (data) => {
    const stored = data[CACHE_KEY];
    if (stored && typeof stored === "object") {
      for (const [handle, country] of Object.entries(stored)) {
        countryByHandle.set(handle, country);
      }
      console.log(
        `[X Location Checker] cache loaded: ${countryByHandle.size} known accounts`
      );
    }
    if (data[QID_KEY] && Date.now() - data[QID_KEY].ts < QID_TTL_MS) {
      queryInfo = data[QID_KEY];
    }
    if (data[FEATURES_KEY] && typeof data[FEATURES_KEY] === "object") {
      learnedFeatures = data[FEATURES_KEY];
    }
    decorateAll();
  });

  setInterval(() => {
    if (!cacheDirty) return;
    cacheDirty = false;
    const entries = [...countryByHandle.entries()].slice(-CACHE_MAX);
    chrome.storage.local.set({ [CACHE_KEY]: Object.fromEntries(entries) });
  }, 5000);

  function remember(handle, country) {
    if (countryByHandle.get(handle) === country) return;
    countryByHandle.set(handle, country);
    if (country) {
      const resolved = tcbCountryFromLocation(country);
      console.log(
        `[X Location Checker] @${handle} → ${resolved ? resolved.flag : "(no flag)"} ${country}`
      );
    } else {
      console.log(`[X Location Checker] @${handle} → no country data`);
    }
    cacheDirty = true;
    decorateAll();
  }

  // ------------------------------------------- passive harvest (interceptor)
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== "tcb-about") return;
    if (typeof data.screenName !== "string") return;
    // Self-learn the endpoint from the request X itself just made — beats
    // bundle scanning, and survives operation renames automatically.
    if (typeof data.queryId === "string" && typeof data.opName === "string") {
      if (!queryInfo || queryInfo.id !== data.queryId) {
        queryInfo = { id: data.queryId, name: data.opName, ts: Date.now() };
        chrome.storage.local.set({ [QID_KEY]: queryInfo });
        queryDiscoveryFailed = false;
        console.log(
          `[X Location Checker] learned endpoint ${data.opName}/${data.queryId} — active lookups enabled`
        );
        pump();
      } else {
        queryInfo.ts = Date.now(); // still current — refresh TTL
      }
    }
    remember(
      data.screenName,
      typeof data.country === "string" ? data.country : ""
    );
  });

  // ------------------------------------------------- queryId discovery
  // X rotates GraphQL query ids with each web-app build. The bundles embed
  // entries like: {queryId:"AbCd123",operationName:"AboutAccountQuery",...}
  async function discoverQueryId() {
    const urls = new Set();
    for (const script of document.querySelectorAll("script[src]")) {
      urls.add(script.src);
    }
    for (const entry of performance.getEntriesByType("resource")) {
      if (/\.js(\?|$)/.test(entry.name)) urls.add(entry.name);
    }
    const candidates = [...urls].filter((u) =>
      /twimg\.com|\/responsive-web\//.test(u)
    );
    console.log(
      `[X Location Checker] queryId discovery: scanning ${candidates.length} bundles`
    );
    // main.*.js almost always holds the operation table — try it first.
    candidates.sort((a, b) => {
      const am = /main\./.test(a) ? 0 : 1;
      const bm = /main\./.test(b) ? 0 : 1;
      return am - bm;
    });

    const namePattern = OPERATION_NAMES.join("|");
    const regex = new RegExp(
      `queryId\\s*:\\s*"([\\w-]+)"\\s*,\\s*operationName\\s*:\\s*"(${namePattern})"`
    );
    for (const url of candidates.slice(0, 30)) {
      try {
        const text = await fetch(url).then((r) => r.text());
        const match = text.match(regex);
        if (match) {
          queryInfo = { id: match[1], name: match[2], ts: Date.now() };
          chrome.storage.local.set({ [QID_KEY]: queryInfo });
          console.log(
            `[X Location Checker] queryId found: ${match[2]} = ${match[1]}`
          );
          return queryInfo;
        }
      } catch {
        /* bundle unreachable — try next */
      }
    }
    console.warn(
      "[X Location Checker] queryId discovery FAILED — no bundle contains " +
        OPERATION_NAMES.join("/")
    );
    return null;
  }

  async function ensureQueryId() {
    if (queryInfo && Date.now() - queryInfo.ts < QID_TTL_MS) return queryInfo;
    if (queryDiscoveryFailed) return null;
    const found = await discoverQueryId();
    if (!found) queryDiscoveryFailed = true;
    return found;
  }

  // ---------------------------------------------------- active About fetch
  function csrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)ct0=([^;]+)/);
    return match ? match[1] : null;
  }

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

  async function fetchAbout(handle, attempt = 0) {
    const info = await ensureQueryId();
    const ct0 = csrfToken();
    if (!info || !ct0) {
      if (!ct0) console.warn("[X Location Checker] no ct0 cookie — logged out?");
      return; // logged out or endpoint not found — give up
    }

    const params = new URLSearchParams({
      variables: JSON.stringify({ screenName: handle }),
      features: JSON.stringify(learnedFeatures),
    });
    const response = await fetch(
      `${location.origin}/i/api/graphql/${info.id}/${info.name}?${params}`,
      {
        headers: {
          authorization: BEARER,
          "x-csrf-token": ct0,
          "x-twitter-auth-type": "OAuth2Session",
          "x-twitter-active-user": "yes",
        },
        credentials: "include",
      }
    );

    const remaining = Number(response.headers.get("x-rate-limit-remaining"));
    const resetSec = Number(response.headers.get("x-rate-limit-reset"));
    if (Number.isFinite(remaining)) rateRemaining = remaining;
    if (Number.isFinite(resetSec) && resetSec > 0) rateResetMs = resetSec * 1000;
    console.log(
      `[X Location Checker] About fetch @${handle}: HTTP ${response.status}` +
        (Number.isFinite(remaining) ? ` (quota left: ${remaining})` : "")
    );
    if (response.status === 429) {
      const reset = Number(response.headers.get("x-rate-limit-reset")) * 1000;
      pausedUntil = reset > Date.now() ? reset : Date.now() + 15 * 60 * 1000;
      const waitMin = ((pausedUntil - Date.now()) / 60000).toFixed(1);
      console.log(
        `[X Location Checker] rate limited — pausing ${waitMin} min, resume at ` +
          new Date(pausedUntil).toLocaleTimeString() +
          ` (${queue.length + 1} lookups queued)`
      );
      queue.push(handle); // retry after the pause
      return;
    }

    const text = await response.text();
    if (response.status === 400 && attempt < 3) {
      // GraphQL tells us exactly which feature flags it wants:
      // "The following features cannot be null: foo, bar"
      const match = text.match(/features cannot be null:\s*([\w,\s]+)/i);
      if (match) {
        for (const name of match[1].split(/[,\s]+/).filter(Boolean)) {
          learnedFeatures[name] = false;
        }
        chrome.storage.local.set({ [FEATURES_KEY]: learnedFeatures });
        return fetchAbout(handle, attempt + 1);
      }
    }

    if (!response.ok) {
      remember(handle, ""); // negative-cache; avoids hammering broken handles
      return;
    }
    try {
      remember(handle, findBasedIn(JSON.parse(text), 0) || "");
    } catch {
      remember(handle, "");
    }
  }

  function enqueue(handle) {
    if (countryByHandle.has(handle) || inFlight.has(handle)) return;
    if (queue.includes(handle)) return;
    if (queue.length === 0) {
      console.log(`[X Location Checker] queueing lookups, first: @${handle}`);
    }
    queue.push(handle);
    if (queue.length > 300) queue.shift();
    pump();
  }

  async function pump() {
    if (pumping) return;
    pumping = true;
    while (queue.length > 0) {
      if (Date.now() < pausedUntil) {
        setTimeout(() => {
          console.log("[X Location Checker] rate-limit pause over — resuming lookups");
          pump();
        }, pausedUntil - Date.now() + 1000);
        break;
      }
      // Proactive stop: leave a small quota reserve instead of eating a 429.
      if (
        rateRemaining !== null &&
        rateRemaining <= 2 &&
        rateResetMs > Date.now()
      ) {
        pausedUntil = rateResetMs + 1000;
        console.log(
          `[X Location Checker] quota nearly spent — pausing until ` +
            new Date(pausedUntil).toLocaleTimeString()
        );
        continue;
      }
      const handle = queue.pop();
      if (countryByHandle.has(handle) || inFlight.has(handle)) continue;
      inFlight.add(handle);
      try {
        await fetchAbout(handle);
      } catch {
        /* network hiccup — drop, will re-enqueue if still on screen */
      }
      inFlight.delete(handle);
      // Spread the remaining quota evenly across the rest of the window.
      let gap = FETCH_GAP_MS;
      if (rateRemaining !== null && rateResetMs > Date.now()) {
        gap = Math.max(
          FETCH_GAP_MS,
          (rateResetMs - Date.now()) / Math.max(rateRemaining - 2, 1)
        );
      }
      await new Promise((resolve) => setTimeout(resolve, gap));
    }
    pumping = false;
  }

  // ---------------------------------------------------------- DOM badges
  function handleFromUserNameEl(el) {
    const links = el.querySelectorAll('a[href^="/"]');
    for (const link of links) {
      const match = link.getAttribute("href").match(/^\/([A-Za-z0-9_]{1,15})$/);
      if (match) return match[1].toLowerCase();
    }
    const at = (el.textContent || "").match(/@([A-Za-z0-9_]{1,15})/);
    return at ? at[1].toLowerCase() : null;
  }

  // Scale the tweet's text by the author's economic tier (the GDP gag).
  const BUILTIN_SCALES = { 1: 1.5, 2: 1, 3: 0.75 };

  function scaleForCountry(country) {
    const resolved = tcbCountryFromLocation(country);
    if (tierMode === "custom") {
      const custom = resolved ? customTiers.map[resolved.code] : undefined;
      return custom !== undefined ? custom : (customTiers.defaultScale ?? 1);
    }
    return resolved ? BUILTIN_SCALES[tcbTierForCode(resolved.code)] : 1;
  }

  function applyTier(el, country) {
    if (!gdpSizing) return;
    const article = el.closest("article");
    if (!article) return;
    // Only the top-level author sets the size, not quoted-tweet authors.
    if (article.querySelector('[data-testid="User-Name"]') !== el) return;
    const scale = scaleForCountry(country);
    if (scale === 1) {
      delete article.dataset.tcbScaled;
      article.style.removeProperty("--tcb-scale");
    } else {
      article.dataset.tcbScaled = "1";
      article.style.setProperty("--tcb-scale", String(scale));
    }
  }

  // "button" placement: no automatic lookups (zero rate-limit pressure) —
  // render a small 📍 button instead; clicking it fetches that one user.
  function ensureCheckButton(el, handle) {
    if (el.querySelector(".tcb-check")) return;
    const button = document.createElement("span");
    button.className = "tcb-check";
    button.textContent = "📍";
    button.title = "Check location";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.textContent = "…";
      enqueue(handle);
    });
    const anchor = el.firstElementChild;
    if (anchor) anchor.insertAdjacentElement("afterend", button);
    else el.appendChild(button);
  }

  function decorate(el) {
    const handle = handleFromUserNameEl(el);
    if (!handle) return;

    const country = countryByHandle.get(handle);
    if (country === undefined) {
      if (placement === "button") ensureCheckButton(el, handle);
      else enqueue(handle);
      return;
    }

    const checkButton = el.querySelector(".tcb-check");
    if (checkButton) checkButton.remove();

    applyTier(el, country);

    const existing = el.querySelector(".tcb-badge");
    if (!country) {
      if (existing) existing.remove();
      return;
    }
    const resolved = tcbCountryFromLocation(country);
    const flag = resolved ? resolved.flag : null;
    const label =
      displayMode === "text" || !flag
        ? country
        : displayMode === "both"
          ? `${flag} ${country}`
          : flag;
    if (existing && existing.dataset.handle === handle &&
        existing.textContent === label) {
      return;
    }
    if (existing) existing.remove();

    const badge = document.createElement("span");
    badge.className = "tcb-badge";
    badge.dataset.handle = handle;
    badge.textContent = label;
    badge.title = `Based in: ${country}`;

    // Anchor: after the timestamp link ("date" mode, when one exists in this
    // name row — e.g. timeline tweets), otherwise right after the name block.
    let anchor = null;
    if (placement === "date") {
      const timeEl = el.querySelector("time");
      if (timeEl) anchor = timeEl.closest("a") || timeEl;
    }
    if (!anchor) anchor = el.firstElementChild;
    if (anchor) anchor.insertAdjacentElement("afterend", badge);
    else el.appendChild(badge);
  }

  function decorateAll() {
    for (const node of document.querySelectorAll('[data-testid="User-Name"]')) {
      decorate(node);
    }
  }

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      decorateAll();
    });
  });

  // X's theme (light/dim/black) is set per-account, not via OS preference, so
  // detect it from the actual body background and expose it to our CSS.
  function updateTheme() {
    const bg = getComputedStyle(document.body).backgroundColor;
    const rgb = bg.match(/\d+/g);
    let theme = "dark";
    if (rgb && rgb.length >= 3) {
      const [r, g, b] = rgb.map(Number);
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      theme = luminance > 128 ? "light" : "dark";
    }
    document.documentElement.dataset.tcbTheme = theme;
  }

  const themeObserver = new MutationObserver(updateTheme);

  function start() {
    observer.observe(document.body, { childList: true, subtree: true });
    themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    updateTheme();
    decorateAll();
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
