# Client caching

Built-in school module data stays in memory during navigation. Opening a module
renders its last successful response immediately and starts a request on every
visit. There is no freshness timer. Successful responses replace the cached data;
failed refreshes retain it and show an error. Empty responses are cached too.

Coverage includes dashboard modules and notifications, timetable, both native
and DSB substitution plans, calendar, study groups, attendance, file storage
(folders and searches), file distribution, courses and course/entry/weekly views,
submission lists and details, messages and conversations, profile, and elections.
Election forms and settings keep their editing flows so a background response
cannot replace an unsaved draft. External Schulportal pages are owned by SPH.

`useCachedResource` owns read requests and shares an in-flight request for a key.
It allows requests to finish after navigation. APIs with a refresh flag receive it
on repeat visits and manual refreshes. `useCachedState` supports the interactive
views' existing loaders and local changes without losing their data on unmount.
Those loaders retain their cancellation and request-order checks.

Keys include the backend, account, login generation, demo/live mode, and the
resource's view options. Sign-out, authentication loss, and account deletion clear
the session cache synchronously. Aborted requests and old state callbacks cannot
restore cleared data. Existing account-owned persistent caches for courses,
messages, profile, and module discovery continue to work. New cached data is not
written to browser storage and a full reload starts a new memory cache.

Cached video rooms remain visible, but joining requires a successful status check
on the current visit. The existing 30-second live-status poll is retained.
Submission changes wait for current permissions to load; failed revalidation keeps
the files visible while blocking uploads/deletions. Course homework controls wait
for pending course reads so a late response cannot overwrite a new edit.

Run `npm test` for cache, account cleanup, request ordering and existing regression
checks, and `npm run build` for TypeScript, the production bundle and prerendering.
For browser integration checks, start `npm run dev -- --port 5187` and run:

```sh
BROWSER_EXECUTABLE=/path/to/chromium node scripts/test-client-cache-browser.cjs
```

The browser check uses synthetic demo data, delays/fails requests, and verifies
cached navigation at desktop and mobile widths. `CACHE_TEST_ORIGIN` overrides the
default local URL. Elections use a dev-only fixture because they have no demo route.
