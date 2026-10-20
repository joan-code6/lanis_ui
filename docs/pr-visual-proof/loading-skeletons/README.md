# Loading skeleton recordings

Recorded from this branch's actual `/demo` routes in Chromium at 1280 × 800 and 390 × 800. Each main recording visits Dashboard, Mein Unterricht, Nachrichten, Lerngruppen, Kalender, and Stundenplan, briefly holding the relevant mock API response and then releasing it. The lower-left caption identifies the route, viewport, and response state. Playback is slowed for inspection. These held responses and playback timings are not a measurement of backend response time.

- [Desktop recording](desktop.mp4)
- [Mobile recording](mobile.mp4)
- [Compact Stundenplan — desktop](timetable-compact-desktop.mp4)
- [Compact Stundenplan — mobile](timetable-compact-mobile.mp4)

Only fetched content receives placeholders. Headings, field labels, action buttons, course tabs, search/filter controls, calendar month/weekdays/dates, and timetable day headings stay visible. The timetable recordings cover both card and compact layouts without a loading spinner.

The dashboard recording starts with its module cache cleared. Its header, controls, and notifications remain visible while module cards load. The mobile dashboard scrolls to the card area. All displayed account content comes from the built-in fictional demo data.

Profile normally uses the authenticated user's existing data immediately in demo mode, so its cold-loading skeleton is not shown in these recordings. A separate cold-loading browser check verified the profile labels and six dynamic-value placeholders. A course-detail check verified all three tabs, the teacher label, and the history filter while the response was held, including switching tabs before releasing it.

Validation: `npm test`, `SKIP_PRERENDER=1 npm run build` (the PR-preview build), and browser checks of desktop/mobile layout, static text, and loading-to-content transitions. Both timetable layouts were checked for page overflow and absence of a spinner at 1280px and 390px.
