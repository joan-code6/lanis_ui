# Opening LANIS with data already on screen

The goal is to show useful content as soon as the app can render. A returning
user should see the last successful screen, then receive changes in the
background. Brand-new information still needs a network request. A first login,
a cleared cache or an unseen page cannot show information the device has never
received.

## What the source review found

- `resourceCache.ts` already preserves page data during navigation, but only in
  memory. Closing the browser or Android WebView loses it.
- `PreferencesContext.tsx` reads saved account preferences, then still blocks the
  application on the preferences request. Page data cannot start rendering until
  that request finishes.
- `Layout.tsx` warms module responses after 500 ms, one module at a time. A slow
  response prevents later modules from starting. Those speculative responses are
  retained for only 30 seconds and are handed to navigation once.
- Android is currently on `feat/android-app`, not `main`. It shares these React
  screens but restores credentials from its native vault.
- lanis_api already has live response caches, background revalidation for some
  resources, encrypted outage snapshots and a daily cache warmer. Another cache
  on the server alone would still leave the device waiting for a request.
- The production build still includes a large initial JavaScript bundle. Saved
  data removes data-request waits after React starts; it does not eliminate
  JavaScript download, parsing, WebView startup or an enabled Android app lock.

## Concept 1: Show the saved screen, then update it — implemented

Imagine opening the timetable on a slow connection. The timetable you last saw
appears immediately. A small notice gives its saved date and time. LANIS asks for
the latest version while you can read the saved screen. When the request
succeeds, the new data replaces it. If the request fails, the saved screen stays.

The same mechanism serves existing resource and interactive-state hooks, so it
also covers messages, course views, calendar, dashboard notifications and other
previously viewed modules. It does not store message drafts or file bytes.
Search results, demo data and short-lived video-room links are excluded.

Clean saved preferences also open the app while their server check is pending.
New accounts and unfinished preference migrations retain the existing gate.
The background preferences request cannot undo a newer local edit; migrations
and saves share a queue.

The snapshot cache holds at most 40 views, approximately 1.5 MB of UTF-16 text,
with a smaller limit per view. Entries older than seven days are not restored.
Large pages may therefore need a normal request. The cache belongs to a backend,
account and login generation. Token rotation preserves it; logout, account
deletion and changing backends clear it. Late responses cannot recreate it after
logout. This is private browser/WebView storage, not an encrypted offline vault.
Existing authentication and account deletion recovery still finish before any
saved school data is mounted.

## Concept 2: Prepare other modules without a single-file queue — separate PR

Keep the current visible screen first. After its existing 500 ms head start,
use two workers for module preloading. If calendar is slow, another worker can
prepare messages and courses. This is bounded speculation, not a burst of every
module request at once.

Dashboard/sidebar ordering, connection restrictions and the single-use response
handoff stay intact. Cleanup stops queued modules and follow-up reads. Requests
already in progress remain available to navigation, which may be sharing them.
Manual refresh still bypasses speculative responses.

This helps navigation readiness. It does not promise that every module will be
ready instantly, nor does it persist every prefetched response for the next
launch. Production benefit depends on server capacity and upstream latency.

## Concepts to consider after these changes

1. **Load less JavaScript before the first screen.** Split public, settings and
   rarely used module routes into lazy chunks. This targets download/parse time,
   which saved data cannot fix. Preload the likely next route to avoid trading
   startup delay for a navigation delay.
2. **A small startup response from lanis_api.** Return preferences, capabilities
   and selected summary data together, with independent timestamps and partial
   errors. This can reduce first-login request waterfalls. It must preserve
   authorization, mutation invalidation and snapshot revocation. Avoid making
   the whole response wait for the slowest Schulportal module.
3. **Refresh before Android is opened.** Extend existing device sync to selected
   frequently used data. This can improve the age of the saved screen, but adds
   battery/network costs and Android does not guarantee background execution.
   It is a later step, not a requirement for instant saved rendering.

## Validation and what it proves

Unit/regression checks cover restart restoration, age/size bounds, account and
login separation, token-free scope keys, storage failures, failed refreshes,
logout races and edits during preferences restoration. Browser fixtures hold
all data and preferences loaders pending across a full reload at 390 and
1440 pixels: saved content and preferences must still render. The fixtures then
check offline retention, fresh replacement and switching accounts.

The existing module browser suite checks navigation, background updates and
failure retention at both widths. These are behavior checks, not a real-device
speed benchmark. No production latency or Android cold-start timing is claimed.

For rollout, compare existing content-ready telemetry for cached and uncached
launches, request counts, refresh failures and data age on representative web and
Android devices. Assess first installation separately from a returning launch.
