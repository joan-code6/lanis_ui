# Self-service Android closed beta

Depends on [lanis_api #98](https://github.com/joan-code6/lanis_api/pull/98).
Rollout: backend then UI; admin #15 is superseded, with no queue or export dependency.
No deployment is performed by these PRs. Recruitment defaults to disabled until
the CLOSED release is approved and actual opt-in/download access is verified.

Backend configuration:
- `ANDROID_BETA_ENABLED=false` (default; retain while release is in review).
- `ANDROID_BETA_GROUP_URL=https://groups.google.com/g/lanis-beta/about`
- `ANDROID_BETA_JOIN_URL=https://play.google.com/apps/testing/de.joancode.lanis`

After dashboard load, eligible Android browsers receive an invitation when due,
excluding Capacitor and waiting for onboarding/other dialogs. Showing it starts a
seven-day account-backed cooldown, as does Später. Nicht mehr anzeigen suppresses
future invitations. Settings always keeps both links, including when recruitment
is disabled or preference loading fails, with clear release-availability wording.

Users sign into Google with their Play Store account, join the group, then
explicitly join the CLOSED test with the same account before downloading. Some
supervised child accounts may be restricted by Google. Membership only establishes
eligibility. LANIS does not collect Google email, verify membership/enrollment or
installation, or infer any of them from link clicks. No OAuth, Groups API,
self-confirmation, approval popup or waiting-list state remains.

The API retains only account ID, dismissal and cooldown-until. It removes the old
email registry on migration while preserving recruitment preferences. Privacy copy
and the [operator runbook](https://github.com/joan-code6/lanis_api/blob/feat/android-beta-signup/docs/android-closed-beta.md)
describe activation and genuine 12-tester/14-day participation requirements.

Validation: `npm test`, `npm run test:beta`, `npm run build`, and after building,
`CHROME_PATH=/path/to/chromium npm run test:beta:browser`. Browser coverage includes
390px/1440px dark layouts, both URLs, no email field, activation gating, native
exclusion, cooldown/dismissal, persistence failure/retry, Settings links while
unavailable/offline and onboarding/modal arbitration. Screenshots go to `/tmp`.

CI-skip markers prevent automatic Cloudflare PR preview deployment under the
no-deploy instruction. Local checks are recorded in the PR.
