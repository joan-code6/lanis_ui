# Android lesson progress and Nothing Glyph integration

Opt-in under Settings → Android und Widgets → Unterrichtsfortschritt, on Android 16+ devices. This checks OS eligibility, not a vendor guarantee of promoting LANIS notifications. Nothing Phone (2), model A065 / Phone (2), additionally shows a Glyph settings hint. No SDK key, accessibility permission, notification listener or foreground service is required.

The native notification uses Android ProgressStyle and requests promoted ongoing status. Its chronometer counts down from the end timestamp in System UI without keeping the app open. Numeric progress is updated from the encrypted timetable by WorkManager, also on app resume and timetable/widget updates. WorkManager is best effort; Doze may delay progress and lesson/break transitions. Notification timeout prevents an expired lesson staying visible. Nothing firmware determines whether a promoted notification is rendered on Glyph. Physical Phone (2) face-down/locked validation is still required; no hardware compatibility result is claimed.

Breaks default off and cover gaps between non-cancelled lessons on the same Berlin school day, including free periods. Nothing appears before the first or after the last lesson. Invalid intervals and cancelled lessons are ignored. Logout and invalidated sessions clear progress and scheduled work. Settings reside only in the encrypted device vault and are removed on logout. App lock hides subject names.

Enable notifications, Android Live Updates and Nothing Glyph Progress. Promotion permission is separate from push preferences; this feature does not enable message push. The switch is explicit consent to tracking lessons automatically when they start.

References:
- https://developer.android.com/develop/ui/views/notifications/live-update
- https://developer.android.com/reference/android/app/Notification.ProgressStyle
- https://nothing.community/en/d/47265-nothing-os-40-general-release

Before release, verify permission denial/recovery, lesson→break→lesson transitions, screen off/face down, Doze, user dismissal, app lock, logout, reboot and timetable changes on real hardware. The current minute updates do not guarantee smooth Glyph movement during Doze.

Validation: TypeScript and Android JavaScript regression tests pass. All 16 native unit tests pass (including four lesson/break boundary tests); Android debug lint passes. No frontend production build was run, following AGENT.md. Existing ignored web assets were reused only to configure the native test environment. No APK was installed or published, and native settings/device rendering was not visually verified.

Optional “Nur kurz vor Ende anzeigen” limits both lessons and enabled breaks to their final 1–60 minutes (initial value 5). Off preserves whole-interval progress. The progress bar spans the visible window; short intervals start at their actual start. The native scheduler includes the configured threshold, subject to WorkManager/Doze delays. Other switches preserve the saved threshold.

Live Update lesson/break countdowns are now available on all Android 16+ devices. Hardware/OS eligibility does not guarantee OEM promotion. The UI uses “Unterrichtsfortschritt”; Nothing Phone (2) alone gets the additional Glyph settings hint. There is no documented public per-notification Glyph opt-out while keeping the promoted Live Update; no nonfunctional app-side Glyph toggle is exposed.

Window/general Android update validation: TypeScript, Android JS regressions, all 19 native unit tests and Android debug lint pass. No new production frontend build or physical-device UI/Glyph verification was performed.
