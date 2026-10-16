# LANIS Android

The Android app packages the existing React/Vite interface with Capacitor 8. It lives in this repository, under `android/`; the web target stays at the repository root. There is one shared frontend, so no monorepo migration is required. `lanis_api` remains a separate backend.

## Features

- Android bottom navigation, native back-button handling, keyboard/system-bar insets, external links in browser tabs, and bundled UI fonts.
- Encrypted Android Keystore-backed login and personal timetable snapshot in `noBackupFilesDir`. Tokens are held in memory in JavaScript, with encrypted native persistence, instead of WebView localStorage.
- Cached personal timetable fallback when a request fails due to connectivity or server errors, visibly dated and marked as cached. Authentication failures do not fall back to private data.
- Three resizable native home-screen widgets: next lesson, today's lessons, and changes/notices from the resolved personal timetable. These use Android RemoteViews so they work without a running WebView.
- WorkManager refresh at a 15-minute minimum interval when connected, app resume refresh, widget refresh button, and cached lesson-boundary updates. These are best-effort; Android can delay them. The app does not start foreground services or request exact alarms. WorkManager contributes its own library manifest declarations.
- FCM notifications, permission handling, category/window/preview preferences, device-token rotation, and session binding to reject queued notifications from a previous login.
- Launcher shortcuts, a timetable Quick Settings tile, and native file sharing/saving through the Android chooser.
- On logout, encrypted snapshots and credentials are deleted, scheduled work and displayed notifications are cancelled, and widgets are cleared. Existing backend logout revokes subscriptions.

Substitution widgets show resolved personal-timetable changes and unmatched notices. They do not claim to show every raw entry in a school's substitution plan. Homework/exam widgets and incoming share-to-submission intents are outside this implementation.

## Requirements and build

Use Node 22+, JDK 21, Android SDK platform 36 and its build tools. Android 8 (API 26) or later is supported. Install Android Studio and set `ANDROID_HOME`, or use the manual GitHub Actions workflow.

The user explicitly authorized Android builds and local build-tool installation on 2026-10-16, overriding this repository's general `AGENT.md` no-build instruction for this Android work. See [android-verification.md](android-verification.md) for actual validation results and device-test limitations.

Build a debug APK:

```sh
npm ci
npm run android:apk
# Build, run native unit tests, and run Android lint:
npm run android:verify
```

This creates the shared web bundle in `dist-android`, syncs Capacitor assets/plugins, and runs Gradle. The debug APK is at `android/app/build/outputs/apk/debug/app-debug.apk`. `npm run android:open` opens Android Studio; `npm run android:run` syncs and runs on a connected device. No website prerender runs for the Android target.

The default Android backend is `https://lanis-backend.joancode.dev`. Override `VITE_API_URL` at build time or use the existing custom-backend screen. Native background sync requires HTTPS. The web development default remains unchanged. Do not put production credentials in build variables or app assets.

On Linux ARM64, Google's distributed Linux `aapt2` is an x86-64 executable. Set `LANIS_ANDROID_AAPT2` to a compatible packager or executable wrapper. The build script also recognizes this host's task-local wrapper at `~/.local/share/lanis-android-tools/aapt2`, then `/usr/bin/aapt2`. Debian's `aapt2` 2.19 cannot read the SDK 36 resource table; the configured local wrapper runs Google's SDK 36 packager through QEMU with isolated x86-64 runtime libraries. This override affects only the LANIS build invocation. Machine SDK paths are in ignored `android/local.properties`.

For a signed Play Store bundle, configure these environment variables and run `npm run android:bundle`:

- `LANIS_KEYSTORE_PATH`
- `LANIS_KEYSTORE_PASSWORD`
- `LANIS_KEY_ALIAS`
- `LANIS_KEY_PASSWORD`

Without signing variables, release bundles remain unsigned. Preserve your release signing key and increase `versionCode` before each published update. No signing key or Firebase configuration is checked in.

## Push configuration

Widgets and normal app use do not require Firebase configuration.

1. In a Firebase project, register the Android package `de.lanis.app`.
2. Place its `google-services.json` at `android/app/google-services.json` (ignored by Git). Rebuild the app to enable registration. Only Firebase Messaging is included; no Analytics dependency is added.
3. Deploy the companion `lanis_api` changes from its `feat/android-app` branch through your normal approved production process.
4. On the backend, install its updated requirements. Set `LANIS_FIREBASE_PROJECT_ID` and `GOOGLE_APPLICATION_CREDENTIALS` to the path of the server-side service-account file with permission to send FCM messages. The service-account private key belongs only on the server, never in the APK or frontend.
5. In Android settings inside LANIS, select notification categories and enable notifications. Grant Android's notification permission, then send a test.

The backend still polls SPH at the account's configured interval and within its notification window. Push reduces device polling; it does not make upstream SPH data instantaneous. Devices without Google Play services can use the app and widgets but FCM delivery needs a separate future transport.

## Links

Launcher shortcuts/widget intents open explicit app activities. Website App Links additionally need the website operator to publish `/.well-known/assetlinks.json` for `de.lanis.app` and the release signing certificate's SHA-256 fingerprint. This file cannot be finalized before choosing the signing certificate. Without verification, explicit widget/notification intents still work; ordinary website links depend on Android's link-handling settings.

## Verification

```sh
npm run typecheck
npm run test:android
```

Run companion backend tests for Android delivery, browser delivery regression, notification routes, and account cleanup. Native model tests are in `android/app/src/test` and can run through Gradle when builds are authorized.

Before releasing on a phone/emulator, verify:

- Login, initial onboarding, app restart, token expiry/refresh, logout, and account switching.
- Timetable online/offline, past-dated cache warning, server errors, invalid sessions, no lessons, cancellations, double lessons, alternating weeks, and Europe/Berlin DST transitions.
- All widgets at multiple sizes, widget taps/refresh, app process death, reboot, and battery-saving modes.
- Notification permission denied/granted/revoked, FCM token rotation, test delivery with the app closed, correct destinations, quiet windows, and no previous-account content after logout/login.
- Back closes drawers/search before navigation; keyboard and navigation bars don't overlap controls; light/dark/OLED themes, large font scaling, reduced motion, portrait/landscape, and attachments through the chooser.

## Local presentation preview

Run `npm run dev -- --port 3017`, then open `/demo/settings/android?android-preview=1`. The development-only flag changes the UI presentation; it does not enable native APIs or simulate successful permissions/registration. It is ignored in production web builds.

### Android 1.0.1 refinements

The bottom bar supports any number of unique shortcuts under **Settings → Android und Widgets → Deine Navigationsleiste**. Add, remove, or reorder entries; selecting another slot's shortcut swaps them. The bar scrolls horizontally when needed, and removing every shortcut hides it. The existing header toggle still opens the sidebar; there is no redundant **Mehr** button. Choices are saved on this device and update immediately. Unsupported school modules are hidden without erasing saved choices.

The Android launcher switches activity aliases to follow the selected app colour.
All six variants reuse the exact generated PNGs in `public/favicon/themes`; launchers
may take a moment to refresh their icon cache. Widgets use these same assets,
Outfit typography, neutral card surfaces, and the selected accent and OLED mode.
Outfit's upstream license is included in `docs/licenses/Outfit-OFL.txt`.

`MainActivity` owns system-bar and keyboard insets. Capacitor SystemBars inset
handling is disabled, and consumed insets prevent the WebView from applying the
keyboard space a second time.
