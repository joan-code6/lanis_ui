# Android implementation verification

Verified on the development worktrees, 2026-10-16. Production was not accessed or changed.

## Passed

- Frontend TypeScript check (`npm run typecheck`).
- Capacitor/Vite configuration type check.
- Four Android source tests covering route allowlisting, unsafe link rejection, connectivity/server fallback, and preventing authentication errors or alternate plans from showing cached personal data.
- Existing timetable refresh, exam layout and colour checks.
- Android resource XML parsing and manifest component/source resolution checks.
- Capacitor native plugin dependency update, without compiling or packaging web assets.
- Browser preview at 412px and 360px: settings/widget selector, timetable navigation, More drawer open/close, no horizontal page overflow, no PWA installation prompt in Android presentation.
- Backend Android delivery, existing Web Push, notification routes, account deletion/export, resolved timetable, authentication identity/session recovery/revocation checks: 133 passed, 1 skipped. The skipped timetable test requires private live data. Existing deprecation warnings remain.
- Ruff for the new backend transport and tests; import formatting for the modified delivery module. The existing delivery module has unrelated baseline lint findings, so a full-module lint pass is not claimed.

## Not yet verified

The repository's `AGENT.md` prohibits builds. No Android SDK/JDK/emulator was installed at inspection time. Consequently, no APK/AAB has been compiled and no native model tests, Gradle lint or device tests have run. Seven native widget-model unit tests are provided for the authorized build phase.

Firebase client configuration, backend FCM credentials, a release signing key, and website App Links association are not supplied. Push delivery and verified website links therefore still need their external configuration and live verification. Existing widget/notification intents use explicit activities and do not depend on website association.

The manual GitHub Actions workflow is supplied but has not been pushed, dispatched or executed. The local UI preview uses demo data and the development-only Android presentation flag. It is not an emulator or evidence of native runtime correctness.
