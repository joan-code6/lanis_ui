# Deployed timetable verification

Checked the actual Cloudflare PR preview in headed Chromium, dark/cyan, at 390 × 850. Mock timetable responses were held inside the deployed app to expose loading and refresh behavior.

The previous preview served `index-Bo2NyNdv.js`: no date range, no today badge, and three generic 98px cards. PR #107 had merge conflicts with main, which blocked its pull-request build and left that old deployment in place.

After merging current main, CI built source commit `f1490383c07596abc6fe971cb1c240deb4fe0084` and deployed `index-CO3habIC.js`. The actual preview was then checked again:

- The date range and today badge are present before the response is released.
- Placeholder lessons have a title row, period badge with the known “Std.” label, arrow, clock, teacher, and room icons. Only the values receive placeholders.
- Lesson values use the same `TimetableLessonFields` component in placeholders and populated cards. The base placeholder is 114px high, with three 16px metadata rows.
- After initial loading, clicking refresh keeps the actual lesson cards. Their measured rectangles remain identical while the refresh response is held; there are no replacement skeletons.
- Local headed-browser checks passed at 390px and 1280px. Tests, TypeScript, production bundle, and the fresh GitHub CI build passed after resolving main conflicts.

[Deployed browser recording](deployed-timetable.mp4)

[Initial loading](deployed-loading-fixed.png) · [Refresh with populated cards retained](deployed-refresh-fixed.png)

These checks cover actual deployment and the lesson rows, rather than only the static headings and controls measured in the earlier cleanup. They do not claim that unknown lesson counts, optional class labels, homework, and notices have predictable heights before their data arrives.
