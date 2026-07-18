# X Location Checker

Chrome extension that shows the X-verified **"Account based in"** country (the data on `x.com/<user>/about`) as a flag next to every user name on X/Twitter.

## How it works

For each user name visible on screen, the extension resolves the based-in country from three sources, cheapest first:

1. **Persistent cache** (`chrome.storage.local`) — a country rarely changes, so once resolved it's remembered across sessions.
2. **Passive harvest** — `interceptor.js` (page MAIN world) wraps `fetch`/XHR; whenever your own browsing opens an About panel, the response is harvested for free.
3. **Active fetch** — `content.js` calls the same `AboutAccountQuery` GraphQL endpoint X's web app uses, authenticated by your own logged-in session (cookies + the public web bearer token). Requests go through a paced queue (one every 1.5 s), back off on HTTP 429 until the rate-limit window resets, and negative-cache users with no data.

Two pieces make this survive X's frequent web-app changes:

- **QueryId discovery** — GraphQL query ids rotate with every web build. Instead of hardcoding one, the extension scans X's own JS bundles (`main.*.js` first) for `queryId:"…",operationName:"AboutAccountQuery"` and caches the result for 24 h.
- **Adaptive feature flags** — when a GraphQL call fails with "The following features cannot be null: …", the extension parses the list, adds the flags, and retries.

`countries.js` maps the country name to a flag emoji; unmapped values are shown as text. Hover the badge for the raw value.

## Install

### From a release (no build tools needed)

1. Download the `.zip` from the [latest release](https://github.com/vladyslavnes/x-location-checker/releases/latest) and unzip it
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the unzipped folder
5. Log in to x.com — click the 📍 next to any name to check a location

Note: Chrome shows a "developer mode extensions" reminder on startup for
extensions installed this way; that's normal.

### From source

Same as above, but select this repository folder at step 4.

## Caveats

- Requires being logged in (the About endpoint needs an authenticated session).
- The About endpoint is rate-limited, so on a fresh install flags appear gradually (~40/minute); after that the cache makes them instant.
- Not every account exposes a based-in country (older accounts, some regions); those get no badge.
- If X renames the GraphQL operation entirely, add the new name to `OPERATION_NAMES` in `content.js`.
