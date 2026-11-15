# Android 1.0.15: stored widget colours

Version code 16. Verified 2026-11-15T08:24:42.262869+00:00.
Built source: `1aaec7e67f868b389d355b1c2749372ea0b2c64a`.
Bundle SHA-256: `76de821689ba2ea233bd09da6acff131d97944561fe76369280777c91351f48b`.

The 1.0.14 widget renderer used a fixed rose-toned neutral palette and kept account appearance separate from its preference snapshot. This correction removes those colours. Native widgets now use the stored account `appearance.theme_color` and `appearance.theme_mode`, with the same primary-shade calculation and neutral surfaces/text as the app. The WebView bridge waits for account preferences to load, sends appearance with timetable settings, and cannot override that snapshot with startup defaults. Native background sync refreshes `/settings/preferences`; failed, invalid or unstored responses retain the last valid appearance. Existing course-colour overrides and aligned row geometry remain supported.

TypeScript, Android bridge regressions, Android web build/Capacitor sync, signed release bundle, all 30 release-mode Kotlin tests and release lint pass. Five native tests cover saved appearance, app-token parity, system/OLED mode, preference failure retention and legacy bridge compatibility. The bridge regression deliberately uses a saved custom colour while the WebView theme still contains Ruby. Upload signature matches the LANIS certificate; Firebase configuration is enabled. No new emulator/device visual verification is claimed.

## Google Play

All four configured tracks were attempted independently after verifying that the highest uploaded code was 15.

| Track | Version 16 result |
| --- | --- |
| internal | PUBLISHED |
| alpha | IN_REVIEW |
| beta | HTTP 400: Precondition check failed. |
| production | HTTP 400: Precondition check failed. |
