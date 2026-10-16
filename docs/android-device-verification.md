# Android device polish — 16 October 2026

Continues PR #91 from `f80a412b` in an isolated worktree. Production services were not changed.

## Changes

- Shortened Android settings, status messages, and signed-out widget copy.
- Kept shortcut selectors within narrow screens and corrected reorder accessibility labels.
- Increased bottom-navigation labels to 12px, preserved full accessible names, and revealed an active shortcut when it would otherwise be offscreen.
- Reduced the next-lesson widget's minimum height: Pixel Launcher now offers 4 × 2 instead of 3 × 3. Existing widgets retain their user-selected size.
- Fixed Windows builds by invoking the Gradle wrapper through Java without a command shell. This avoids cmd AutoRun directory changes and shell quoting of tool paths.

## Verification

- `npm run android:verify`: TypeScript, bundled Android assets, Capacitor sync, APK assembly, 7 native model tests, and Android lint passed. Lint retains 16 warnings and 0 errors.
- `npm run test:android`: 5 tests passed.
- `git diff --check`: passed.
- Impeccable detector: one pre-existing gradient-text utility in `src/index.css`; no finding in the changed Android components.

Device Hub devices:

- Pixel 7, Android 16: installed and launched the debug APK; checked login with the real Gboard keyboard, password field and submit-button visibility, keyboard dismissal, shortcut reordering and persistence, OLED settings/sidebar, Back dismissing the sidebar without navigating, and an overflowing navigation bar revealing its active Settings item. The twelve supported demo shortcuts fit a horizontal bar with 12px labels; no main-content horizontal overflow was measured at 412 CSS pixels.
- Pixel Launcher: requested and added the native next-lesson widget, checked its signed-out state in light and OLED modes, and confirmed the new 4 × 2 pin size. No account data was fabricated to test widget contents.
- Medium Tablet, Android 15: installed and launched the APK; inspected login and demo Android settings at the native landscape size. The desktop sidebar layout remained available.
- Browser preview: checked the Android settings at phone and desktop sizes and confirmed active-item visibility in an overflowing bar.

The default Device Hub boot attempts failed. Starting the emulators with software graphics (`-gpu swiftshader -feature -Vulkan -no-snapshot`) and accepting the local ADB authorization allowed both to attach to the hub. The phone also needed Gboard selected instead of the automation helper's invisible input method for a real keyboard check.

## Authenticated continuation

The user supplied the test account separately after the first pass. Credentials are excluded from this repository and report.

- Login succeeded on the Pixel 7. Native background sync populated a five-day timetable and both pinned next-lesson widgets with real account data.
- WebView local storage contained no `auth_` keys. The encrypted native session and timetable remained available after force-stopping and restarting the app with Wi-Fi and mobile data disabled.
- The offline timetable displayed both the offline banner and the dated saved-copy warning.
- Authenticated testing exposed a launcher-alias lifecycle issue: changing colour could remove the running task. Launcher aliases now target a separate, nonvisual forwarding activity with no task affinity; the real MainActivity owns the app task. Alternating colours retained the foreground authenticated app, and a fresh tablet install retained the login screen after changing the alias.
- Capacitor debug logs included sensitive native bridge payloads. Native bridge logging is now disabled for all build types. The rebuilt app produced zero credential/payload log entries during session restoration and native calls.
- The current backend returns 404 for the optional Android push-config endpoint while notification preferences are available. Only that 404 now resolves to push-unconfigured; other failures still propagate. This keeps normal settings available on older backends.
- Confirmed the rebuilt Android settings show no general error, load editable preferences, and explicitly show push as unconfigured against that backend.
- Confirmed logout returns to login, leaves zero native session keys and no native timetable or update timestamp, and clears both populated widgets back to their signed-out state. No account credentials remain in WebView local storage.

## Remaining release checks

Switching between different accounts, expired/revoked sessions, scheduled WorkManager execution under battery restrictions, and long-duration notification/background delivery still need device coverage. Demo checks above are presentation checks only.

Firebase configuration remains absent, so real push registration/delivery is untested. iOS simulators are unavailable on Windows. This continuation does not integrate the PR's older branch with current `main`; review that integration before merging.
