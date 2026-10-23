# Android 1.0.1 verification

Verified 2026-10-16 in the Android UI worktree. No production changes.

- Artifact: `artifacts/android/lanis-1.0.1-debug.apk`; 14575630 bytes.
- SHA-256: `87b0ef67e12df69f0ca2caa3b59f40ef5c25a1da2001aa3f067396b962fcb3a4`.
- Version code 2; Android 8+, target SDK 36; debug certificate matches 1.0.0.
- TypeScript, Android web bundle and Capacitor sync passed.
- Clean app build plus native tests and lint passed (`:app:clean`, then `node scripts/android-build.mjs verify`).
- Native widget-model tests: 7 passed; frontend Android tests: 5 passed.
- Lint: 0 errors, 16 warnings. Warnings are dependency updates, KTX suggestions and generated Cordova configuration.
- APK v2 signature, ZIP integrity and 16 KB alignment passed.
- Six launcher artwork files match the official generated web icons byte for byte.
- Packaged SystemBars configuration disables its inset handler; MainActivity consumes bar and IME insets.
- Browser at 412px width: reduced-height login remains scrollable; feedback dialog opens and completes a mocked submission; shortcut changes update immediately; duplicate selections swap; all available modules scroll horizontally; empty shortcuts hide the bar; sidebar toggle remains present. Mock feedback was never sent to a server.
- Device panel reports Android unavailable. Physical-device keyboard layout, launcher refresh and native widget rendering still require on-device confirmation.
- Firebase configuration remains absent; push registration is disabled in this artifact.

Changes restore the existing feedback feature from the feedback branch, use official themed launcher assets, align native widgets with the app's font and neutral/OLED surfaces, remove competing keyboard inset handling, and allow any number of configurable bottom shortcuts while retaining the sidebar toggle.
