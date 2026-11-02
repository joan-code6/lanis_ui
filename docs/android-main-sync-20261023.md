# Android main synchronization — 2026-10-23

UI main integrated: `08a07b93e3ce76a353e34d26b36fcd8a38db7abc`.

The Android branch now includes every commit from current main, including the submissions rewrite, Dateiverteilung, video rooms, shared module styling and skeletons, account-scoped resource caching, prefetching, logout race protection, settings navigation, and deployment tooling changes.

Integration changes preserve encrypted native authentication and deletion recovery, native timetable/widget persistence and dated offline warnings, app locking, native file sharing, and mobile timetable day selection. Dateiverteilung and video rooms are available as customizable Android navigation items. Native links also accept these modules and Wahlen. Submission and distribution downloads use the platform file helper.

Session cleanup is serialized with native writes so a delayed logout cannot erase a subsequent login. Personal cache ownership and Axios token checks use the encrypted credential adapter on Android. The companion lanis_api PR registers Android push against the authenticated session ID required by current main.

Browser verification: Android presentation renders dashboard, timetable, Dateiverteilung, video rooms, submissions and Android settings at 390px and 1440px without page errors or horizontal page overflow.

Validation: `npm run typecheck`, `npm run test:android`, and `npm test` pass. The native storage regression includes signing out while a subsequent login is queued. The companion backend passes 82 focused Android push, authentication, notification and account-lifecycle tests, including revoked-session registration fencing.

No APK was assembled in this update; AGENT.md instructs agents not to run builds. Device Hub reports Android unavailable because the emulator is missing from the local SDK. Prior device evidence is historical and has not been repeated for this merge. Firebase delivery still requires configuration and live verification. Both PRs remain drafts. Production was not changed.
