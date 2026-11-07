# Self-service Android closed beta

Depends on [lanis_api #98](https://github.com/joan-code6/lanis_api/pull/98).
Rollout: backend then UI; admin #15 is superseded, with no queue or export dependency.
Only the PR-specific frontend preview deployment is authorized. Recruitment defaults to disabled until
the CLOSED release is approved and actual opt-in/download access is verified.

Backend configuration:
- `ANDROID_BETA_ENABLED=false` (default; retain while release is in review).
- `ANDROID_BETA_GROUP_URL=https://groups.google.com/g/lanis-beta/about`
- `ANDROID_BETA_JOIN_URL=https://play.google.com/apps/testing/de.joancode.lanis`

After dashboard load, eligible Android browsers receive an invitation when due,
excluding Capacitor and waiting for onboarding/other dialogs. Showing it starts a
seven-day account-backed presentation cooldown. The single Nicht mehr anzeigen
button permanently suppresses automatic invitations; Escape does the same. Settings → App & Hilfe has a compact card whose Beta ansehen
button opens the same popup manually, including after permanent dismissal. It
does not reset that preference or automatically open the dialog. The card gates
its button on availability and supports loading/error/retry states. Disabled
recruitment or a failed preference load shows no automatic invitation.

The first action opens Google AccountChooser with the configured group/about
page as its return URL. This avoids the group page's generic sign-in link, which
returns to the Groups home page. LANIS receives no Google credentials or OAuth
callback. Google still requires explicit confirmation to join the group. Legacy
/group/.../subscribe redirects to the private conversations page; /g/.../subscribe
returns 404, so neither is used.

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
exclusion, cooldown/dismissal, single-button permanent dismissal, save-failure local close, preference-load recovery
and onboarding/modal arbitration. Manual-card checks cover dismissal preservation,
focus return, availability gating and failed-load recovery. Screenshots go to `/tmp`.

The normal build → Cloudflare PR-preview pipeline is authorized. Production and
backend deployments remain outside scope. Local checks are recorded in the PR.

### Shared invitation link

Share `https://lanis.arg-server.de/?joinbeta` to open the beta popup explicitly.
The request survives login and onboarding in the same tab and is consumed when
shown. It also works on desktop and after a previous automatic-invitation
dismissal, without resetting that preference. Recruitment must still be enabled
and its configuration must load successfully. Other URL parameters and the hash
are preserved; `joinbeta` itself is removed to prevent repeated openings.
