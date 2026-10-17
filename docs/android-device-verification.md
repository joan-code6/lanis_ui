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

## Sign-in usability continuation

- Added exact school-ID search alongside name/place search. Device input `5201` returns the correct school, and Down/Enter selects it without submitting credentials.
- School results now expose combobox/listbox/option semantics, an active keyboard selection, Escape/native-Back dismissal, and loading/retry states.
- Selecting a school focuses username; Enter advances from username to password. Username/current-password autocomplete hints support password managers without saving credentials in app code.
- Password visibility has a named toggle and a 44px touch width. Login errors announce themselves; duplicate submits and edits during a pending login are blocked.
- Reduced the footer to the privacy link, shortened selected-school text, and improved placeholder contrast.
- Android verification and all 12 existing tests passed; the scoped design detector reported no findings.

## Timetable and search continuation — 17 October

- Added phone day buttons to jump directly to a timetable day. Selecting Thursday moved the card scroller to Thursday; scrolling back updated the selected day, and refreshing preserved the chosen day. The tablet keeps its existing grid without the phone picker.
- Search now uses a named dialog/combobox, traps and restores focus, follows the displayed category order with arrow keys/Enter, and scrolls the active result into view. The phone dialog fits above Gboard; the tablet dialog remains within its viewport.
- Server search waits for two nonblank characters. Closing search or changing the query cancels outstanding keyword and semantic requests, preventing stale semantic results.
- Cache/API/navigation copies of a destination are deduplicated, module URLs are replaced by concise subtitles, and core module results route to their native pages. One-letter demo search produced 12 distinct destinations without raw URLs; keyboard selection opened the expected demo timetable.
- Other module results use the dashboard's existing module-opening handler. The Klassenbuch demo result opened its external-module preview, consumed its query parameter, and Android Back closed the preview without leaving the demo dashboard.
- Android verification, the 7 native model tests, the 5 frontend tests, and `git diff --check` passed. The scoped detector found only the existing timetable accent border.

## Current-main integration — 17 October

- Integrated main at `3121cad6`, retaining its account-deletion lifecycle, onboarding, search-visibility preferences, timetable substitutions, PWA installation flow, and nine themes.
- Account lifecycle operations use the Android encrypted vault. Deletion recovery proofs stay outside WebView storage, persist through partial cleanup, and block native background sync until resolved. Logout retains the generation guards and clears the native session/cache/widgets.
- Added Android launcher aliases and widget artwork for Coral, Blush, and Moss. All three changed the launcher alias while the foreground app remained open.
- Kept web installation prompts out of Android. Removed a duplicate account-settings row introduced by the automatic merge.
- Increased mobile menu/search targets to 44px and exposed the selected colour to assistive technology. The login backend disclosure wraps at readable size.
- Tablet timetable now uses three columns at 1280 CSS pixels, with five on wider screens. Short homework labels and wrapping lesson headers eliminate the clipped labels observed on the device; no text clipping or page overflow was measured after the fix.
- Real-account sign-in succeeded after integration, populated five native timetable days, and left zero authentication/recovery keys in WebView storage. Authenticated settings loaded with one account row and no general error. Logout returned to login with zero native session keys, no cache, and a zero update timestamp.
- `npm run android:verify`, the five frontend tests, account lifecycle regression checks, encrypted native-storage regression checks, and `git diff --check` passed. Both Device Hub emulators ran the rebuilt APK.

## Navigation accessibility continuation — 17 October

- Mobile menu is a named modal with initial close-button focus, keyboard cycling, background inertness, Escape/Android-Back dismissal, and opener focus restoration. Its trigger exposes expanded state; current sidebar links expose page state.
- Opening search, feedback, or logout closes the drawer first. Device verification caught and fixed the menu-search overlap; the rebuilt app exposes one search dialog and focuses its input.
- Replaced duplicate sidebar logout popovers with one concise modal. Cancel receives initial focus, both controls are 44px high, background content is inert, and pending logout prevents repeated submission or dismissal.
- Android Back with no browser history returns demo pages to the demo dashboard. A device check from the demo timetable confirmed the mode is preserved.
- Phone and tablet checks covered focus cycling, Back dismissal, and logout controls. Final phone checks confirmed menu-to-search/logout transitions and Escape restoring focus with background inertness removed.
- Android build/unit tests/lint, six frontend regression tests, encrypted-session checks, and account-lifecycle checks passed. The scoped design detector reported no findings.

## Dashboard and copy continuation — 17 October

- Phone module cards use two columns with smaller artwork and shorter spacing; tablets keep four columns at 1280 CSS pixels. Removed repeated module labels and the duplicate notification heading/count treatment.
- Module cards expose named keyboard links. Enter opened the demo Klassenbuch dialog, focus moved to its close control, and Escape restored focus to the module.
- Dashboard search has a label, a clear control, and an empty-state reset action. No-match search and reset were verified; leading/trailing query whitespace is ignored.
- Grid/list/customize controls are named and 44px high. Both list and card customization layouts stayed within the phone viewport. Edit mode retains wider cards for its controls.
- Shortened settings-index descriptions and redundant appearance text. Fixed selected-view icon contrast in dark themes, including Moss.
- Six frontend tests, encrypted-session and account-lifecycle checks, Android assembly/unit tests/lint, and the scoped design detector passed. Phone/tablet dashboard checks measured no page overflow or unnamed visible buttons.

## Final main synchronization — 17 October

Main advanced again during verification. Integrated `e59d3800`, preserving the new deployment workflows and practical setup guide alongside the Android scripts and documentation. Regenerated the combined lockfile; a clean install with scripts disabled passed, followed by the frontend, encrypted-storage, and account-lifecycle checks.

The inherited Cloudflare deployment checks passed 5 of 6 checks on Windows. The remaining fixture creates a POSIX executable stub, which Windows cannot execute (`spawnSync ... wrangler ENOENT`); deployment workflows run on Ubuntu. Deployment code was preserved unchanged, and no deployment was performed locally.

## Course attachment fix — 17 October

- Course attachments now use a private cache file and Android's file viewer instead of unsupported WebView blob downloads. Files retain their original names in unique cache folders; existing logout cleanup removes them.
- External-link handling runs after component click handlers and respects prevented clicks, so authenticated attachments no longer also open an unauthenticated backend URL in a browser. Entry-detail attachments use the same authenticated download path as cards and the timeline.
- A viewer receives a read-only content URI and MIME type. Devices without a compatible viewer fall back to save/share. The native opener rejects files outside the dedicated cache folder.
- Signed in with the supplied test account, opened a real course PDF from the phone UI, confirmed it rendered in the PDF viewer, and returned to the course without an error. Signed out afterward. No account content was changed.
- Added native-file regression checks for private cache writes, viewer handoff, missing-viewer fallback, visible failures, and the existing export/share flow. Android verification (TypeScript, APK, native unit tests and lint) and frontend regression checks passed.

## Android icon scale — 17 October

- Added a 16.667% foreground inset to all nine generated adaptive launcher icons and both default aliases, compensating for Android's expanded adaptive layers. The web artwork and widget image scale stay unchanged.
- Added a separately padded splash drawable so the system's circular mask has room around the logo. The generator owns the padding, keeping regeneration consistent.
- Installed the rebuilt APK and compared the Moss launcher icon on the phone before and after: the cap now has visible space around it instead of nearly filling the mask. Native assembly, unit tests and lint passed; lint reported no errors. The APK also includes the latest Dashboard navigation label.

## Remaining release checks

Switching between different accounts, expired/revoked sessions, scheduled WorkManager execution under battery restrictions, and long-duration notification/background delivery still need device coverage. Demo checks above are presentation checks only.

Firebase configuration remains absent, so real push registration/delivery is untested. iOS simulators are unavailable on Windows.
