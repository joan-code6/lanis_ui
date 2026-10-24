# LANIS UI analytics

PostHog receives explicitly opted-in browser events through its EU ingestion host.
The integration lives in `src/analytics`. No LANIS API server instrumentation is added.
The private PostHog administration key must never enter a Vite environment variable,
source file, test artifact or browser bundle.

## Deployment configuration

Set these **build-time** variables in the UI hosting environment:

```dotenv
VITE_POSTHOG_KEY=<public project key from PostHog, starting with phc_>
VITE_POSTHOG_HOST=https://eu.i.posthog.com
```

The current local worktree has an ignored `.env.local` configured for EU project
214484. This file is not included in the PR. The GitHub repository variable `VITE_POSTHOG_KEY` is configured with this public key. The frontend workflow supplies it only to main-branch builds; PR previews have analytics disabled. Other hosting systems must configure the same build variables. The project is still
named “Default project”; changing project settings needs project administration
access that the connected PostHog tools do not have.

The SDK is loaded only after consent. Missing/invalid configuration, a `phx_` key,
a non-EU ingestion host, Vite development mode and demo mode all disable capture.
There is no permissive fallback token or host. No production deployment is part
of this change.

## Consent and identity

- The compact prompt sits at the bottom right on desktop and centered at the bottom on mobile. Accept appears first as the primary action; decline uses the secondary button.
- Consent is browser-local, versioned by `lanis_analytics_consent_v1`.
- It can be changed from the privacy policy and Settings → Datenschutz und Konto.
- Withdrawal prevents new captures and clears local SDK identity persistence.
  Already transmitted requests cannot be recalled and historical events remain.
- Changes synchronize across tabs through the storage event. Blocked local
  storage fails closed. Consent withdrawal during SDK loading cancels capture.
- Random browser identifiers are never associated with a LANIS account. No
  `identify`, account ID, school ID or server correlation headers are used.
- Logout rotates the random identifier without waiting for analytics delivery.
- This is pseudonymous analytics, not a count of accounts or all visitors. Browser
  resets, shared devices, logout, declined consent, blockers and network failures
  affect counts. Install completion depends on browser `appinstalled` support.

## Event contract (schema version 1)

Every event has `app=lanis_ui`, `schema_version=1`, `environment=production`,
a sanitized `page`/`$pathname`, random SDK identity/session metadata, disabled
person processing and disabled GeoIP enrichment. The public token is retained
for ingestion. Other SDK properties are removed before transmission, including
full URLs, referrers, campaign parameters, page titles, initial person properties,
error objects, element text, school IDs and account details. Unknown event names
and unknown property keys/values are rejected.

| Event | Trigger | Additional allowed properties |
| --- | --- | --- |
| `$pageview` | Initial eligible page, consent grant, or route change | None |
| `login_started` | Login submission reaches the auth context | None |
| `login_succeeded` | Authentication succeeds and the session is accepted | None |
| `login_failed` | Authentication fails | None |
| `logout_completed` | Local authentication state is cleared | None |
| `onboarding_completed` | User completes onboarding locally | None |
| `onboarding_skipped` | User skips onboarding locally | None |
| `search_opened` | Global search opens | None |
| `search_result_selected` | A global search result is activated | None |
| `file_search_submitted` | A nonempty file search is submitted | None |
| `file_folder_opened` | A file storage folder is selected | None |
| `file_download_succeeded` | File retrieved and browser download dispatched | None |
| `file_download_failed` | File download fails, excluding cancellation | None |
| `message_sent` | API confirms sending a new message | None |
| `message_replied` | API confirms sending a reply | None |
| `homework_updated` | Homework update request resolves | `done`: boolean |
| `settings_updated` | Local preference change or confirmed notification save | `section`: appearance, dashboard, timetable, homework, sidebar, notifications |
| `install_requested` | Install selected from promotion or settings | `source`: promotion, settings |
| `install_dismissed` | Install prompt dismissed | `permanent`: boolean |
| `app_installed` | Browser emits `appinstalled` | None |
| `api_request_failed` | API request rejects, excluding cancellation | `module`, `failure` enums below |

API `module` is one of auth, messages, courses, calendar, timetable, files,
substitution, settings, notifications, other. `failure` is one of network, timeout,
unauthorized, forbidden, rate_limited, server, client. No request body, response
body, URL, status text or exception message is included. Consecutive identical
module/failure combinations are throttled to one event per ten seconds. Request
failures can include recoverable authentication retries; they are not a measure
of final user-visible failures or an API error rate (no request denominator).

Page labels use a closed route list. Course IDs become `/courses/:id`; unknown
paths become `/other`. Query strings and hash changes do not create pageviews.
React effect replays and consecutive equivalent route labels are deduplicated.
Visiting two different course IDs without leaving the detail route intentionally
counts once. Actions attach the safe page label from the time they are captured.

Settings events record an attempted local preference change, not necessarily a
successful server sync. Onboarding likewise completes locally and may sync later.
Downloads measure dispatch, not completion of a file save by the operating system.
No school content, message body, recipient, subject, homework text, filename,
search query, calendar entry, election choice, class, grade or profile field is
an event property.

## SDK safeguards

Autocapture, replay, console capture, exception autocapture, heatmaps, performance
capture, surveys, feature flags, toolbar dependencies, and automatic pageviews
are disabled. SDK batches are disabled to avoid retaining unsent batches across
consent changes. Failed requests may still complete or retry after the browser
already handed them to its networking layer. Analytics failures are best effort
and must not block authentication or school workflows.

Server-side IP discarding was already enabled on project 214484 when inspected.
The integration also removes `$ip` and disables GeoIP on events. Network transport
necessarily presents an IP address to the ingestion service. The SDK settings
are explicit because the old project has replay and console capture enabled at
the project level; this integration does not load those features.

## PostHog dashboard and cleanup

[LANIS UI — Usage and reliability](https://eu.posthog.com/project/214484/dashboard/1051450)
contains eight native charts: consenting active browsers, popular pages, login
outcomes, onboarding, feature actions, installation, and failures by category
and module. Every query filters `app=lanis_ui`, isolating it from historic Outcraft
traffic. All charts were executed successfully before deployment with no LANIS
traffic yet. These are implementation-specific definitions, not governed Data
Catalog metrics.

The four previous dashboards and their exclusive insights were soft-deleted, as
were the nine remaining pre-LANIS saved AI charts. Historical events, recordings,
cohorts, project metadata and the old Outcraft deployment have not been deleted
or changed. The connected app cannot create/update/delete projects. A saved
private secret reference is not consumable by its project administration tools.

## Verification

From this worktree:

```sh
npx tsc --noEmit
node --experimental-vm-modules scripts/test-analytics.mjs
npm run dev -- --host 127.0.0.1 --port 5198
# In another terminal; CHROME_PATH points to a native Chromium installation:
CHROME_PATH=/path/to/native/chrome node scripts/test-analytics-browser.mjs
```

The current upstream `AGENTS.md` requires a build and demo verification; these supersede the older `AGENT.md` note. The browser test enables the production
gate only in the intercepted test module, substitutes a fake public key, and
intercepts all remote requests. No test data is ingested into the live project.
It exercises the real SDK, no capture/storage before consent, sanitized capture
results and ingestion requests, disabled replay/config loading, withdrawal,
identity storage removal and regrant. Model tests also cover closed event/property
vocabularies, safe routes, development/demo suppression, deduplication and SDK
import races. Authenticated school flows are not exercised with real school data.
