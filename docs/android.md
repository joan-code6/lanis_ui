# LANIS Android

The Android app packages the existing React/Vite interface with Capacitor 8. It lives in this repository, under `android/`; the web target stays at the repository root. There is one shared frontend, so no monorepo migration is required. `lanis_api` remains a separate backend.

## Features

- Android bottom navigation, native back-button handling, keyboard/system-bar insets, external links in browser tabs, and bundled UI fonts.
- Encrypted Android Keystore-backed login and personal timetable snapshot in `noBackupFilesDir`. Tokens are held in memory in JavaScript, with encrypted native persistence, instead of WebView localStorage.
- Cached personal timetable fallback when a request fails due to connectivity or server errors, visibly dated and marked as cached. Authentication failures do not fall back to private data.
- Three resizable native home-screen widgets: next lesson, today's lessons, and changes/notices from the resolved personal timetable. These use Android RemoteViews so they work without a running WebView.
- WorkManager refresh at a 15-minute minimum interval when connected, app resume refresh, widget refresh button, and cached lesson-boundary updates. These are best-effort; Android can delay them. No foreground service or exact-alarm permission is used.
- FCM notifications, permission handling, category/window/preview preferences, device-token rotation, and session binding to reject queued notifications from a previous login.
- Launcher shortcuts, a timetable Quick Settings tile, and native file sharing/saving through the Android chooser.
- On logout, encrypted snapshots and credentials are deleted, scheduled work and displayed notifications are cancelled, and widgets are cleared. Existing backend logout revokes subscriptions.

Substitution widgets show resolved personal-timetable changes and unmatched notices. They do not claim to show every raw entry in a school's substitution plan. Homework/exam widgets and incoming share-to-submission intents are outside this implementation.

## Requirements and build

Use Node 22+, JDK 21, Android SDK platform 36 and its build tools. Android 8 (API 26) or later is supported. Install Android Studio and set `ANDROID_HOME`, or use the manual GitHub Actions workflow.

This repository's `AGENT.md` says not to run builds. The implementation was checked with TypeScript, source tests, XML checks, and browser preview. An APK/native compile and real-device verification are still required before release. Do not describe the app as release-verified until these have passed.

When builds are authorized:

```sh
npm ci
npm run android:apk
```

This creates the shared web bundle in `dist-android`, syncs Capacitor assets/plugins, and runs Gradle. The debug APK is at `android/app/build/outputs/apk/debug/app-debug.apk`. `npm run android:open` opens Android Studio; `npm run android:run` syncs and runs on a connected device. No website prerender runs for the Android target.

The default Android backend is `https://lanis-backend.joancode.dev`. Override `VITE_API_URL` at build time or use the existing custom-backend screen. Native background sync requires HTTPS. The web development default remains unchanged. Do not put production credentials in build variables or app assets.

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
