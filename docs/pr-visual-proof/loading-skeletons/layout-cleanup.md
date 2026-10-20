# Layout cleanup verification

Inspected the rendered app in **headed Chromium** (`headless: false`) running on an Xvfb display. T3 shared-browser access was disabled for this thread. Mock responses were held and released in the actual demo routes; no alternative UI was rendered for these checks.

## Fixes

- Keep the app in its viewport and reserve the main scrollbar gutter. Loaded file lists no longer introduce a second document scrollbar and shrink headings, search inputs, or refresh buttons sideways.
- Show the known timetable date range from the start. Keep refresh separate from arriving source metadata, reserve metadata height, and match today's badge, compact date labels, and day-card alignment in loading and loaded states.
- Keep day cards in a single horizontal row below the five-column breakpoint. Different lesson counts no longer push later day headings down in the tablet layout.
- Keep the group list first, with the upcoming-exam overview after it. Arriving exam data no longer pushes “Meine Gruppen” down by hundreds of pixels. All exams remain available, including the exam details within each group card.
- Give the calendar category select a stable width so arriving option text does not move the search input.
- Reserve source timestamp lines in both substitution-plan views and the video-room header. Keep fixed text visible and placeholder only the pending value.
- Let the DSB button row wrap on narrow screens instead of overflowing. Reserve distribution-filter count widths and align the course-detail teacher placeholder with the loaded line height.

## Browser measurements

Matched visible headings, buttons, tabs, inputs, and selects by their labels and compared `getBoundingClientRect()` before and after releasing responses. Changes larger than 0.75 CSS pixels were reported. Newly loaded content and its natural length are not treated as a stable anchor.

- [Before](layout-before.json): 37 shifted anchors across 22 transitions at 1280px and 390px.
- [After](layout-after.json): zero shifted matched anchors across those 22 transitions.
- [Tablet / narrow initial check](layout-narrow-initial.json): exposed stacked timetable row movement at 768px and timestamp-line growth at 320px.
- [Targeted recheck](layout-narrow-recheck.json): zero shifted matched anchors in those three corrected views at both widths.

The audited views were Dashboard, Courses, Messages, Study groups, Calendar, Timetable, DSB, File storage, File distribution, Native substitution plan, and Video rooms. The narrow pass also compared select and filter-count widths with labels normalized independently of arriving data.

Mobile main-area scrolling, drawer navigation, route scroll reset, and public landing-page scrolling passed. Course-detail tabs stayed at the same position and height while the teacher response loaded. Existing tests and the PR-preview production build passed.

This verifies the measured demo transitions. Variable content lengths, different numbers of records, errors, and optional data can still change content height; the checks do not claim zero layout shift for every possible account or response.
