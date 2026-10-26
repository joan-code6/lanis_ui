# Web/PWA notification recovery

Web Push uses browser subscriptions, not application webhooks. An authenticated browser that already has notification permission and a subscription now re-registers it outside notification settings. This repairs a backend record lost to an upgrade migration and associates the endpoint with the current login session.

Recovery runs on page load, and checks again while the page is visible. Successful registrations and successful inactive checks (such as disabled account notifications or an unconfigured server) wait 15 minutes. Rejected registrations, unsuccessful API responses and failed requests retry after one minute; returning online or to the page can trigger a due retry. Cancellation is reported separately. New devices and blocked/unrequested permissions are never opted in automatically. The notification settings page continues to own explicit enable/disable actions. Demo routes and native Android are excluded.

A changed server VAPID public key renews an existing subscription. An interrupted renewal is retried while the page remains mounted. If the browser has removed its subscription entirely, or a closed page loses an interrupted renewal, notification settings must activate that device again. Stable VAPID keys should be preserved across deployments.

Repairs abort on route cleanup, logout, account deletion or backend/session changes. The backend also checks session ownership before storing subscriptions. No session credentials are added to service-worker storage.

## Investigation and validation

- Backend subscriptions, polling baselines and pending deliveries are persisted in SQLite; a fresh-process restart regression preserves them. The worker restarts on application startup.
- The session-ownership migration in `lanis_api` commit `c4704a9` removes legacy subscriptions without a session ID. Previously, re-registration occurred only on the notification settings page.
- The backend omitted Web Push TTL, inheriting pywebpush's zero-second offline retention. The companion backend fix uses 24 hours for messages, one hour for plan updates and ten minutes for tests. A real pywebpush encryption test checks the outgoing TTL header against a simulated push service.
- Local signing/configuration exceptions were treated as expired subscriptions. The companion fix preserves these endpoints and removes only explicit 404/410 expirations.

`npm run test:push` checks record restoration, key changes, renewal retry, permission/consent boundaries, cancellation, background scheduling and reconnect behavior. `tsc --noEmit` and account-data lifecycle regression checks also pass. No frontend build or production deployment is performed by this verification.

These findings establish code-level failure paths, not a diagnosis from production logs. Automatic notifications still depend on the account's polling interval and time window, unread-message state, selected class scope, an active login, browser/OS permissions and an available device. Existing test notifications arriving confirms delivery can work; it does not verify that a new automatic event was detected and polled.

References: [pywebpush TTL defaults](https://github.com/web-push-libs/pywebpush/blob/main/pywebpush/__init__.py), [Web Push offline retention](https://blog.mozilla.org/services/2016/02/20/webpushs-new-requirement-ttl-header/).
