# Android 1.0.14 release

- Version: **1.0.14**, version code **15** (`de.joancode.lanis`).
- Verified at: 2026-11-14T23:00:56.985216+00:00.
- Built source: `eed563f599be936e56158c4971ff6805f0f319f2` from Android PR #91, including the widget redesign and the latest Android settings/timetable changes.
- Bundle SHA-256: `f780426b4fdeb3f9cca7af452e5545d75593a9fb2fcba601b174c42b59165854`.
- Local bundle: `artifacts/android/lanis-1.0.14-15.aab` (ignored by Git).

## Verification

Android web build and Capacitor sync pass. Signed release bundle build, all 25 release-mode Kotlin unit tests (including 13 widget-model tests), and release lint pass. `jarsigner` verifies the bundle and its certificate matches the LANIS upload certificate, SHA-1 `3A:F2:60:BB:55:D1:35:70:D3:5A:1C:97:D4:90:B3:96:E3:4C:7C:B7`. Firebase client configuration is included and `PUSH_CONFIGURED` is true. Credentials and signing material remain outside Git. No new physical-device or emulator verification was performed.

## Google Play result

All four configured tracks were attempted through the Google Play Developer API. The upload was checked against the existing highest Play version code (14) before uploading version 15.

| Track | Verified result for version 15 |
| --- | --- |
| Internal (`internal`) | Published |
| Closed testing (`alpha`) | In review; 1.0.13 remains published pending approval |
| Open testing (`beta`) | Rejected with HTTP 400: `Precondition check failed.`; no release published |
| Production (`production`) | Rejected with HTTP 400: `Precondition check failed.`; no release published |

Track writes were isolated so blocked tracks did not roll back accepted releases. Lifecycle state was read back from `applications.tracks.releases.list`; a successful edit commit alone was not treated as proof of publication. Play initially reported the closed release as not sent for review, then advanced it to in review on a subsequent read without another submission.
