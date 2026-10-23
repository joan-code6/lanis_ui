# Android app lock verification

The optional App-Sperre setting uses AndroidX BiometricPrompt with biometric or device-credential authentication. See [Android's biometric authentication guidance](https://developer.android.com/identity/sign-in/biometric-auth). The device PIN, pattern or password supplies the fallback; LANIS stores no additional PIN.

Validated on the Pixel 7 Android 16 emulator through Device Hub:

- A pre-enabled lock blocks startup with the native verification prompt, including a timetable direct link.
- Device PIN verification reveals the WebView.
- Cancelling verification leaves only the native locked cover and unlock button; retry with the correct PIN opens the login screen.
- A subsequent direct-link launch requests verification again.

The emulator fixture enabled the private lock preference directly, used a test-only device PIN and stayed signed out. The settings toggle's full enable/disable interaction, a live biometric sensor, notification delivery and physical-device behavior still need device coverage. The emulator's initial System UI ANR was resolved before these checks; it required software rendering to boot.

Automated validation: TypeScript, Android frontend/session/file/link regression checks, 12 native unit tests (including 5 lock lifecycle tests), APK assembly and Android lint pass. The lock tests cover cold start/recreation, immediate background concealment, device-credential activity return, cancellation/retry and the disabled default. The production backend was not changed.
