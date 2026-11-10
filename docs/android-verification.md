# Android implementation verification

Latest: [Android 1.0.1 verification](android-1.0.1-verification.md). The original 1.0.0 baseline follows.

Verified on the development worktrees, 2026-10-16. No production deployment or service restart was performed by this task.

The user explicitly authorized Android builds and local tool installation, overriding the repository's general no-build instruction for this Android work.

## Installable artifact

- APK: `artifacts/android/lanis-1.0.0-debug.apk`
- Application ID: `de.joancode.lanis`
- Version: `1.0.0` (version code 1)
- Variant: debug, signed with the local Android debug certificate
- Android minimum: API 26 / Android 8
- Target/compile SDK: 36
- APK size: 14246910 bytes
- SHA-256: `88d50d226d7a1efced74e57cbf623c61301a275f9bd0087d34ad609dd600c207`

The artifact and adjacent checksum/JSON record are ignored by Git. The corresponding source changes are committed on `feat/android-app`.

## Passed

- Web production bundle for the Android target (`npm run android:sync`), including TypeScript and Capacitor asset/plugin sync.
- Clean app compilation and packaging (`:app:clean`, then `node scripts/android-build.mjs verify`).
- Seven native widget-model tests: 7 passed, 0 failures, 0 skipped. These cover current lesson selection, lesson boundaries, cancellations, period-based double lessons, unknown times, old cache dates, Berlin winter time, and malformed data.
- Android lint: 0 errors, 16 warnings. Remaining warnings concern newer dependency/tool versions, KTX style suggestions, and the generated Cordova configuration resource. The legacy Quick Settings launch helper has a narrow documented lint suppression because the PendingIntent overload exists only on API 34+; the helper is reached only on API 26–33.
- `apksigner verify`: APK Signature Scheme v2 verified.
- `zipalign -c -P 16 4`: passed on the final APK.
- ZIP entry integrity: passed.
- All packaged native libraries have 16 KB ELF LOAD alignment. The universal APK contains arm64-v8a, armeabi-v7a, x86, and x86_64 library variants.
- Packaged application ID, version and minimum/target SDK verified using Google's resource packager.
- Packaged HTTPS origin, mixed-content restriction, release WebView debugging configuration, and absence of credential/configuration files checked. The debug activity enables WebView inspection for development; this APK is not a release build.
- Four frontend Android link/offline source tests and existing timetable refresh, exam-layout and colour checks passed during implementation.
- Browser preview at 412px and 360px: settings/widget selector, timetable navigation, More drawer open/close, no horizontal page overflow, and no PWA installation prompt in Android presentation. Light/dark presentation inspected.
- Backend Android delivery, existing Web Push, notification routes, account deletion/export, resolved timetable, authentication identity/session recovery/revocation checks: 133 passed, 1 skipped during implementation. The skipped timetable test requires private live data. Existing deprecation warnings remain.

## Host tooling

This machine is Linux ARM64 with 16 KB pages. Installed JDK 21, Google's Android command-line tools, SDK platform 36, build tools 35/36, native adb, and QEMU user-mode translation.

Debian aapt2 2.19 failed to read SDK 36's resource table. Google's SDK 36 aapt2 works through the task-local QEMU wrapper at `~/.local/share/lanis-android-tools/aapt2`, using isolated x86-64 Debian runtime libraries. The build script detects that wrapper without changing global Gradle configuration. `LANIS_ANDROID_AAPT2` can override it on another machine.

An incremental resource-folder rename initially left stale merged icon entries; a clean app build succeeded and is the verification recorded above.

## Not device-verified

No Android device is connected through adb. The T3 Device panel reported Android unavailable. A temporary ARM64 Redroid Android 16 container was attempted, but exited before boot with:

```text
WriteProtected mprotect 1 failed: Invalid argument
libc: WriteProtected mprotect 1 failed: Invalid argument
```

This host uses 16 KB memory pages. The attempted container runtime is incompatible with that setup; it was removed. No host reboot or kernel change was performed. Consequently, installation, WebView/Keystore behavior, keyboard/back gestures, widget hosting, background scheduling, and live notifications still need verification on a compatible phone/emulator. Native unit tests, successful packaging and browser preview do not replace those checks.

## External release configuration

Firebase client configuration and backend FCM credentials were not supplied. This APK is built with push registration disabled; the app and widgets can work independently of Firebase. Push delivery still requires the documented client/server configuration, a rebuilt APK, approved backend deployment, and live testing.

A release signing key and website App Links association are also not supplied. The artifact uses a debug key and is suitable for installation/testing, not Play Store publication. Explicit widget/notification activity intents do not depend on website association. No backend production changes were deployed.

The manual GitHub Actions workflow is supplied but has not been pushed, dispatched or executed.
