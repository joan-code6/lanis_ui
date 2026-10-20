# Loading skeleton recordings

Recorded from this branch's actual `/demo` routes in Chromium at 1280 × 800 and 390 × 800. Each recording visits Dashboard, Mein Unterricht, Nachrichten, Lerngruppen, and Kalender, holding the relevant mock API response for two seconds and then releasing it. The lower-left caption identifies the route, viewport, and response state. This delay makes the transition inspectable; it is not a measurement of backend response time.

- [Desktop recording](desktop.mp4)
- [Mobile recording](mobile.mp4)

The dashboard recording starts with its module cache cleared. Its header, controls, and notifications remain visible while module cards load. The mobile dashboard scrolls to the card area. All displayed account content comes from the built-in fictional demo data.

Profile uses the authenticated user's existing data immediately in demo mode, so its cold-loading skeleton is not shown in these recordings.

Validation: `npm test`, `SKIP_PRERENDER=1 npm run build` (the PR-preview build), and browser checks of desktop/mobile layout and loading-to-content transitions.
