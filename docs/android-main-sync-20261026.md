# Android synchronization — 2026-10-26

UI base: `79ff9e07` (current main). Companion lanis_api base: `cbdf1e3` (current main).

Merged all current main commits into the existing Android branches. This includes Agents/OAuth settings and approval flows, account-linked consent-based analytics and correlated diagnostics, browser push recovery, marketing/status fixes and incident formatting. Preserved encrypted native credentials and deletion recovery, native downloads, timetable offline fallback, app lock and Android message scrolling. Browser push recovery continues to exclude native apps. Native React errors use the shared consent-aware exception reporter while retaining the native recovery UI.

Version 1.0.2, version code 3. Signed with this machine's existing debug key, matching the APK successfully installed on the Nothing Phone (2) on October 23. No uninstall or data reset is required for an update from that APK. Android cannot update an app signed with another machine's debug key; retained data in other profiles can preserve that signing constraint even after a UI uninstall.

Validation: TypeScript, Android JavaScript regressions, frontend regressions, Agents backend-routing tests, analytics/consent tests and browser push tests. Backend focused tests: 96 Android/authentication/account/notification tests and 130 Agents/analytics tests. Native APK assembly, unit tests, lint and artifact signature/alignment verification are performed for this build. Browser checks cover Android presentation at 390px and 1440px for dashboard, timetable, messages, Agents settings, account settings and Android settings. This is presentation verification; no physical-device install or live Firebase delivery is claimed for this update.

The distributed APK includes the configured public analytics project key and release identifier. Tracking still requires the existing consent mechanism. Personal API keys, Firebase private configuration and signing keys are excluded from the artifact and Git. No production service is changed.
