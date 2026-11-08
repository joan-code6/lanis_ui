# Android main synchronization — 2026-11-08

Includes main through `9a27ccfc`: primary/secondary theme colors with hex input and the Firefox-compatible picker, current/next timetable lesson emphasis, compact dashboard cards and simplified privacy controls, grouped incident pages/live status preview, maintenance explanations, and Android beta onboarding.

Preserves native navigation, encrypted auth storage, offline timetable, native file handling and Android settings. Lesson focus initializes the native day selector, with the first day as fallback outside the current week. Dashboard edit controls wrap within the compact cards. Both library picker styles and native inset/navigation styles are retained.

Validation: TypeScript, full frontend suite, Android JavaScript regressions, analytics, browser push and beta onboarding tests passed. No build was run per AGENT.md; no APK, browser presentation or device verification is claimed.
