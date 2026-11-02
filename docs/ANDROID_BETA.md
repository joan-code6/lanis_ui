# Android closed-beta UI

Depends on lanis_api PR https://github.com/joan-code6/lanis_api/pull/98.
Deploy backend first, then operator portal, then UI. This PR performs no deployment.
Backend `ANDROID_BETA_ENABLED` (default false) controls recruitment and join links;
`ANDROID_BETA_JOIN_URL` must be the verified CLOSED opt-in URL.
Full operator runbook: https://github.com/joan-code6/lanis_api/blob/feat/android-beta-signup/docs/android-closed-beta.md.

The dashboard starts a signup invitation only after modules load successfully in
an Android browser. Capacitor native Android is excluded. It waits for onboarding,
other dialogs and PWA-install instructions to close. Showing an invitation starts
a seven-day account cooldown, including when navigation interrupts it. Später also
sets that cooldown; Nicht mehr anzeigen permanently suppresses signup prompts.
Settings always exposes registration/status, correction and withdrawal.

Approval notifications run throughout the authenticated layout and refresh on
visibility/focus resume. Dismissal acknowledges the exact approval revision on the
backend. The Google link itself does not prove opt-in or installation. Settings
retains it while approved and beta availability is enabled. No email notification.

## Validation

- `npm test`
- `npm run test:beta` (platform detection/prompt eligibility)
- `npm run build` (including school-page prerender)
- `CHROME_PATH=/path/to/chromium npm run test:beta:browser`

The browser test bundles the actual component with deterministic account/API
fixtures. It checks 390px and 1440px layouts, signup/waiting, errors, persistent
Settings access, closed-test URL, approval acknowledgement, onboarding exclusion
and cooldown. Screenshots are saved under `/tmp/lanis-beta-*.png`. The browser test
requires a completed build for the production stylesheet and a native Chromium.

PR CI is skipped deliberately because existing successful PR builds automatically
deploy Cloudflare previews, including drafts. This respects the requested no-deploy
boundary; local validation is recorded in the PR. Remove the skip marker in a later
commit only after preview deployment is authorized.
