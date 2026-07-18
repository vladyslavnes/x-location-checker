# Chrome Web Store listing — copy-paste material

## Name
X Location Checker

## Summary (short description)
Shows the X-verified "account based in" country next to user names on X/Twitter.

## Detailed description

Ever wonder where an account is actually posting from?

X verifies every account's "based in" country — but hides it three clicks
deep on the About page. X Location Checker puts it right in your timeline,
next to the name.

HOW IT WORKS

• Click the 📍 next to any user name to reveal their X-verified country —
  flag, name, or both
• Or switch on automatic mode and watch flags fill in as you scroll
• Hover any badge to see the exact value X reports
• Already-checked accounts are remembered, so they show instantly forever

WHY IT'S TRUSTWORTHY DATA

This is not the free-text "location" from user bios ("the moon", "she/her",
"hell") — it's the country X itself determines and publishes on every
profile's About page. Same data, zero digging.

FEATURES

• Check-location button mode (default): looks up only who you ask about —
  light, private, never rate-limited
• Auto mode: paces itself against X's API quota so lookups keep flowing
  without interruptions
• Display: flag only, country name only, or both
• Placement: after the name or after the timestamp
• Every ISO country recognized, with correct flags
• Results cached locally — fast, and works on accounts you've seen even
  before any lookup

THE FUN PART

GDP text sizing (off by default): scales tweet text by the economic tier of
the author's country. First-world opinions get ×1.5, third-world ×0.75.
Don't like our world order? Build your own — custom categories let you
assign any size to any set of countries. Finally, a timeline where font
size equals purchasing power.

PRIVACY

• No tracking, no analytics, no external servers
• Talks only to X's own API, using your own logged-in session
• Everything is stored locally in your browser
• Fully open source: github.com/vladyslavnes/x-location-checker

NOTES

• Requires being logged in to X
• Some accounts don't expose a based-in country (older accounts, some
  regions) — those simply get no badge

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
