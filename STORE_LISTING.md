# Chrome Web Store listing — copy-paste material

## Name
X Location Checker

## Summary (short description)
Shows the X-verified "account based in" country next to user names on X/Twitter.

## Detailed description

Ever wonder where an account is actually posting from? X shows a verified
"Account based in" country on every profile's About page — but only if you go
digging. X Location Checker surfaces it right in your timeline.

Features:
• 📍 Check-location button next to user names — click to look up any account's
  X-verified country (default mode, zero background requests)
• Automatic mode: flags fill in as you scroll, smartly paced to respect X's
  rate limits
• Display options: flag, country name, or both; place the badge after the
  name or after the date
• Results cached locally, so known accounts show instantly
• Fun extra (off by default): GDP text sizing — scale tweet text by the
  author country's economic tier, with fully customizable categories

Notes:
• Requires being logged in to X
• Uses only X's own APIs with your own session — no third-party servers
• Not every account exposes a based-in country

## Category
Social & Communication

## Language
English

## Permission justifications (for the review form)

- **storage** — caches resolved countries and saves user display preferences
  locally.
- **Host permission x.com / twitter.com** — the extension runs on X pages to
  display badges, and fetches the "About this account" data from X's own API
  using the user's session.
- **Host permission abs.twimg.com** — reads X's public JavaScript bundles to
  discover the current GraphQL query id (X rotates it with each release);
  no data is sent.

## Single purpose statement
Displays the country an X/Twitter account is based in (as published by X)
next to the account's name.

## Data usage disclosure (Privacy tab answers)
- Collects no user data. All processing is local.
- Remote code: none (all code packaged; the extension only *reads* X's
  bundles to extract a query id string, never executes remote code).

## Privacy policy
Host PRIVACY.md contents at a public URL (GitHub repo works) and paste the
link into the listing.
