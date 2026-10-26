# LANIS UI analytics

PostHog receives explicitly opted-in browser events through `https://t.lanis.arg-server.de`, forwarding to the EU PostHog project.
The integration lives in `src/analytics`, with corresponding authenticated identity and encrypted diagnostic endpoints in lanis_api. Deploy that backend change first; otherwise events remain browser-only and diagnostic uploads fail gracefully.
The private PostHog administration key must never enter a Vite environment variable,
source file, test artifact or browser bundle.

## Deployment configuration

Set these **build-time** variables in the UI hosting environment:

```dotenv
VITE_POSTHOG_KEY=<public project key from PostHog, starting with phc_>
VITE_POSTHOG_HOST=https://t.lanis.arg-server.de
```

The current local worktree has an ignored `.env.local` configured for EU project
214484. This file is not included in the PR. The GitHub repository variable `VITE_POSTHOG_KEY` is configured with this public key. The frontend workflow supplies it only to main-branch builds; PR previews have analytics disabled. Other hosting systems must configure the same build variables. The project is still
named “Default project”; changing project settings needs project administration
access that the connected PostHog tools do not have.

The SDK is loaded only after consent. Missing/invalid configuration, a `phx_` key,
an untrusted ingestion host, Vite development mode and demo mode all disable capture. Only the configured LANIS proxy and the direct EU ingestion origin are accepted.
There is no permissive fallback token or host. No production deployment is part
of this change.

## Consent and identity

- The compact prompt sits at the bottom right on desktop and centered at the bottom on mobile. Accept appears first as the primary action; decline uses the secondary button.
- Consent is browser-local, versioned by `lanis_analytics_consent_v2`.
- It can be changed from the privacy policy and Settings → Datenschutz und Konto.
- Withdrawal prevents new captures and clears local SDK identity persistence.
  Already transmitted requests cannot be recalled and historical events remain.
- Changes synchronize across tabs through the storage event. Blocked local
  storage fails closed. Consent withdrawal during SDK loading cancels capture.
- After login, `/analytics/identity` returns a stable opaque `la_…` account reference. `identify` merges the consenting anonymous journey into that account. School/usernames never enter PostHog; authorized backend operators can resolve the reference.
- Previous v1 anonymous consent must be renewed for account linkage; previous refusals remain refusals. Changing accounts resets the SDK identity; rotating a session token for the same account preserves it.
- Logout rotates the random identifier without waiting for analytics delivery.
- Counts mix anonymous browsers and identified consenting accounts, never all visitors. Browser
  resets, shared devices, logout, declined consent, blockers and network failures
  affect counts. Install completion depends on browser `appinstalled` support.

## Event contract (schema version 3)

Every event has `app=lanis_ui`, `schema_version=3`, `environment=production`,
a sanitized `page`/`$pathname`, opaque identity/session metadata, identified-only person profiles and disabled GeoIP enrichment. `account_ref` appears only after successful backend identification; `release` is the build SHA or `local`. The public token is retained
for ingestion. Coarse browser/OS names, browser major version and device type are retained from closed vocabularies to diagnose compatibility. Other SDK properties are removed before transmission, including
full URLs, referrers, campaign parameters, page titles, initial person properties,
error objects, element text, school IDs and account details. Unknown event names
and unknown property keys/values are rejected.

| Event | Trigger | Additional allowed properties |
| --- | --- | --- |
| `$identify` | Successful backend account lookup | Opaque account reference and anonymous merge ID; no person traits |
| `$exception` | Browser error, rejected promise, React boundary, API 5xx/network failure | Fixed generic message, asset-only stack frames, `error_origin`, optional `diagnostic_id`/`request_id` |
| `api_request_completed` | Every eligible Axios attempt, including retries and cancellation | Static endpoint template, method, status, duration_ms, outcome, optional business_success, correlation UUIDs |
| `analytics_identity_unavailable` | Backend lookup fails; throttled retry after 60 seconds | None |
| `ui_interaction` | Semantic button/link/checkbox/radio/select click | Control type and sanitized internal destination, no labels/values/DOM IDs |
| `page_engagement` | Route exit, page hide or visibility transition | Visible active_ms, document scroll_depth bucket; background time excluded |
| `page_visibility_changed` | Tab visibility changes | visible/hidden |
| `network_status_changed` | Browser network status changes | online/offline |
| `resource_load_failed` | Script, stylesheet or image error | Resource type, no source URL |
| `$pageview` | Initial eligible page, consent grant, or route change | None |
| `login_started` | Login submission reaches the auth context | None |
| `login_succeeded` | Authentication succeeds and the session is accepted | None |
| `login_failed` | Authentication fails | None |
| `logout_completed` | Local authentication state is cleared | None |
| `onboarding_completed` | User completes onboarding locally | None |
| `onboarding_skipped` | User skips onboarding locally | `step`: fixed onboarding step |
| `search_opened` | Global search opens | None |
| `search_result_selected` | A global search result is activated | `category`: navigation, messages, courses, calendar, timetable, groups, modules, people, other |
| `file_search_submitted` | A nonempty file search is submitted | None |
| `file_folder_opened` | A file storage folder is selected | None |
| `file_download_succeeded` | File retrieved and browser download dispatched | None |
| `file_download_failed` | File download fails, excluding cancellation | None |
| `message_sent` | API confirms sending a new message | None |
| `message_replied` | API confirms sending a reply | None |
| `homework_updated` | API explicitly confirms successful update | `done`: boolean |
| `settings_updated` | Local preference change or confirmed notification save | `section`: appearance, dashboard, timetable, homework, sidebar, notifications |
| `install_requested` | Install selected from promotion or settings | `source`: promotion, settings |
| `install_dismissed` | Install prompt dismissed | `permanent`: boolean |
| `app_installed` | Browser emits `appinstalled` | None |
| `api_request_failed` | API request rejects, excluding cancellation | `module`, `failure` enums below |
| `onboarding_step_viewed` | A loaded onboarding step is displayed; consecutive repeats deduplicated | `step`: welcome, appearance, dashboard, timetable, homework, guide |
| `onboarding_step_completed` | Continue or Finish is selected; local progression, not server-sync confirmation | `step`: same vocabulary |
| `search_session_completed` | A nonempty global-search dialog closes or a result is selected; once per dialog | `outcome`: selected/dismissed; `result_count`: 0, 1, 2-5, 6-20, 21+; `keyword_state`: complete/pending/not_requested |
| `course_opened` | A course link is activated from list or timetable | `source`: course_list/timetable |
| `course_tab_selected` | A different course detail tab is selected | `tab`: history/performance/exams |
| `course_filter_changed` | Homework-only filter is toggled | `homework_only`: boolean |
| `course_view_changed` | A different detail layout is selected | `view`: cards/timeline |
| `timetable_scope_changed` | Personal/full timetable scope is changed | `scope`: personal/all |
| `timetable_week_changed` | An alternate-week control is selected; no actual week/date recorded | None |
| `calendar_view_changed` | Month/list view is changed | `view`: month/list |
| `calendar_navigated` | Previous/next month or today selected | `direction`: previous/next/today |
| `calendar_event_opened` | A calendar entry is clicked, without its content or ID | None |
| `feature_engaged` | Derived once when the SDK accepts a supported deliberate-interaction event | `feature`: courses/timetable/calendar/messages/homework/files/search |

API `module` is one of auth, messages, courses, calendar, timetable, files,
substitution, settings, notifications, other. `failure` is one of network, timeout,
unauthorized, forbidden, rate_limited, server, client. No request body, response
body, URL, status text or exception message is included. Identical
module/failure combinations are throttled independently to one event per ten seconds. Request
failures can include recoverable authentication retries; they are not a measure
of final user-visible failures. Use `api_request_completed` as the attempt denominator, filtered by outcome; retries count separately. HTTP success may still carry `business_success=false`.

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

SDK autocapture, replay, console capture, exception autocapture, heatmaps, performance
capture, surveys, feature flags, toolbar dependencies, and automatic pageviews
are disabled. Explicit sanitized listeners supply clicks and native `$exception` events instead. SDK batches are disabled to avoid retaining unsent batches across
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

## Learning reports (schema v2 and v3)

[LANIS UI — Journeys and retention](https://eu.posthog.com/project/214484/dashboard/1051719)
adds eight reports beside the existing reliability board:

- Login → accepted session → meaningful interaction, ordered within one hour.
- Welcome viewed → welcome/appearance/dashboard/timetable/homework completed → onboarding completed, within 24 hours. The optional first-school guide is excluded.
- Search opened → result selected, within ten minutes. This browser funnel can span repeated dialogs; use session outcomes alongside it.
- Selected versus dismissed search dialogs, one event per closed nonempty dialog.
- Visible-result buckets when a dialog is dismissed after keyword requests complete.
- Meaningful interactions grouped by feature.
- Daily first-observed interaction retention, 14 intervals.
- Weekly first-observed app-page retention, eight intervals, excluding public/legal pages.

`feature_engaged` is derived from course open/tab selection, timetable scope/week
selection, calendar event open/navigation, successful messages/homework/download,
and search-result selection. It does not include passive reading, failed actions,
settings, installation or onboarding. It is an interaction metric, not a canonical
activation definition. Counts measure actions, not unique accounts or benefit.
A regular timetable reader can be retained in the app-page chart while absent
from the interaction-retention chart.

Search result buckets describe the last query's **visible** results at closure,
not all queries typed. Optional semantic search may still be pending. A zero
bucket after keyword completion can identify a problem worth inspecting; it does
not prove that every search backend returned zero matches. No query text, length,
result title, rank, recipient name, content or ID is collected.

Consent granted midway can omit earlier funnel steps. A browser that skips
onboarding is expected to drop out of the completion funnel; the skipped event
records its last step. Back navigation can repeat step events. SDK acceptance
and a dispatched download do not prove network delivery or an operating-system
file save. Definitions are documented and versioned operational reports, not
approved Data Catalog metrics. Live user funnels remain unvalidated until the
UI is deployed and consenting users generate traffic.

## Proxy verification

The proxy's `/e/` endpoint and CORS preflight were checked for the LANIS origin.
A real PostHog SDK capture received HTTP 200 through the proxy. An isolated
`analytics_integration_verified` event with `app=lanis_ui_verification` was also
queried successfully from EU project 214484. These technical test events contain
no school/account data, do not create person profiles and are excluded from both
dashboards' `app=lanis_ui` filters. They are not shipped as production UI events.
The local browser regression suite continues to intercept all outbound traffic
and verifies that ordinary captures use the proxy, with no direct-host bypass.

Configuration follows the [PostHog reverse-proxy guidance](https://posthog.com/docs/advanced/proxy) and [JavaScript configuration reference](https://posthog.com/docs/libraries/js/config).


## Account diagnostics and operating limits (v3)

The browser sends `X-LANIS-Analytics-Consent: account-v2` only after current consent. Authenticated identity/diagnostic requests use the existing session header, never send that header to PostHog, and are aborted on logout/account change/withdrawal. Raw error details go directly to lanis_api, encrypted at rest with AES-GCM and a domain-separated server key. Never use passwords, session IDs or frontend secrets as keys. Seven-day expiry, 20 uploads/minute/account, 100 retained/account and 5,000 total bound the vault. Error deduplication limits browser reports to 20/minute and one matching type/stack/origin per ten seconds.

Every backend response has `X-LANIS-Request-ID`. Operators can use a PostHog account reference, diagnostic reference or request UUID with the audited admin endpoints documented in lanis_api `docs/analytics.md`. The ordinary account export contains references/metadata; account deletion removes the mapping and encrypted backend records. It does not erase historical PostHog events automatically. Withdrawal stops future capture; requests already handed to the network may finish.

Backend request events are optional: configure backend `POSTHOG_PROJECT_KEY` (public `phc_` ingestion key) and `POSTHOG_HOST=https://t.lanis.arg-server.de`. They use `app=lanis_api` and `backend_request_completed`, with static route templates, response status/duration and request UUID. They require the consent header and a live session, exclude analytics/admin routes and never include bodies/query strings. Delivery is bounded and best effort; frontend and backend request events are different views of the same attempt, so do not sum them as requests.

Source map uploading is configured for trusted builds with a management token; until that secret is configured, diagnosing original source requires matching build artifacts. Generic messages intentionally sacrifice message-based grouping. No recordings or arbitrary DOM/form capture are enabled. Document scroll depth does not measure scrolling inside nested module panes. Time on a hidden/closed page is best effort, subject to browser unload/network limits.

Existing dashboards include v2 browser data. Filter `schema_version=3` and `account_ref is set` for account-based reporting; old events cannot be retroactively linked. Feature flags are deployment controls, not an event taxonomy; no unused flags are created merely to match events.

[LANIS — Accounts and diagnostics](https://eu.posthog.com/project/214484/dashboard/1052059) provides six verified native v3 reports: identified active accounts, browser API outcomes, p95 endpoint latency, exceptions/affected accounts, visible engagement segments, and account-linkage failures. It deliberately excludes v2 data. Queries currently return zero/no data until rollout. The connector lacks Data Catalog and dashboard-template scopes; these reports are operational definitions, not approved catalog metrics.

## Experience, feedback and investigation

`content_ready` records a visible content segment after two animation frames, with a closed resource label, ready/failed outcome, cache hit, duration and cache age. It covers shared cached-resource views (timetable, calendar, files/search, attendance and other modules), not every component. Cached content is ready immediately; background revalidation is not a second page visit. `content_refreshed` records explicit refresh outcomes. Navigation cleanup and consent epochs discard stale view completions. `message_read` means a selected conversation successfully loaded into the view; it does not prove the text was read or understood. Existing download/homework/message events continue to represent confirmed outcomes.

`web_vital` records CLS, FCP, INP, LCP and TTFB with rating and value using web-vitals. CLS is a unitless score; all other values are milliseconds. These are document measurements, not per-route SPA timings. Observers start only after consent, and callbacks recheck consent. `feedback_submitted` records only category and whether technical context was attached. The optional unchecked feedback checkbox attaches release, safe route and up to ten request UUIDs directly to LANIS; the server filters out UUIDs belonging to other accounts. Feedback text is never an analytics property.

The private admin portal adds `#investigation`. Operators can enter an `la_` account ref, `ld_` diagnostic ref or request UUID. Account lookup shows diagnostic metadata and the newest 100 technical requests; each decryption is a separate explicit audited read. Request metadata is retained up to seven days (500/account, 50,000 global), excluded from PostHog raw content and removed on account deletion. The portal shows five-minute quality/health counters and conservative warnings: at least 20 requests, at least three affected accounts and 20% server errors; or at least ten diagnostics across three accounts. These are observed thresholds, not a historical anomaly detector or evidence of complete coverage.

## Source maps

The official PostHog Rollup plugin uploads private hidden source maps only when `POSTHOG_API_KEY` is supplied to the build. Configure that GitHub Actions repository secret with error-tracking write access; project 214484 and EU management host are explicit. The key is never a VITE variable and is never passed to PR builds. The matching served chunks receive PostHog chunk IDs; sanitizer retains only UUID chunk IDs plus safe asset frames. Upload failures fail the production build; maps are deleted after upload, and CI refuses public artifacts containing any `.map` files. Without the secret, builds work but emit a CI warning and symbolication remains unavailable. This follows https://posthog.com/docs/error-tracking/upload-source-maps/vite.

The connector cannot create alert destinations (`hog_function:write` unavailable). `scripts/configure-analytics-alerts.mjs` prepares or idempotently applies Discord lifecycle alerts once an authorized management key and webhook are supplied through environment variables. No webhook credentials are committed. Spike detection must be enabled/tuned in PostHog before spike lifecycle alerts can fire.

The experience reports now extend the v3 board with content readiness p95, explicit refresh outcomes, p75 LCP/INP and successful content workflows. CLS remains a unitless score and is not mixed into the milliseconds chart. These reports execute successfully but contain no production v3 data before deployment.
