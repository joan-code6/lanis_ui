# Android main synchronization — 2026-11-02

PR #91 now includes origin/main through 4928e7c2.

Includes the redesigned settings and shared switches, dashboard ordering and touch dragging, timetable consecutive lesson merging, week indicator and card fixes, Signal/WhatsApp onboarding and schedules, agent connection terms and privacy updates, and preview deployment fixes.

Retains Android navigation, encrypted authentication, offline timetable fallback, native file handling, app locking, widgets and notification settings. The new settings structure includes Android controls and routes notifications to native controls on Android.

Validation: TypeScript and Android JavaScript regressions pass. Frontend, analytics and browser push suites are recorded in the PR update. Build omitted per AGENT.md. No APK assembly, device install or production action performed for this synchronization.
