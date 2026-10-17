# Evidence for the technical-log retention disclosure

Checked read-only on 2026-10-17. No production configuration was changed.

## Application code

In lanis_api (`~/projects/lanis`), `api/queue/task_queue.py` configures Python
logging with `logging.basicConfig(level=logging.INFO)` and no file handler.
The API and queue log application events and exceptions, including usernames,
school identifiers, and task names. Uvicorn's default access log records the
client address, HTTP method, requested path (including query string), protocol,
and response status. Do not claim these logs are anonymous or contain only IPs.
No application-owned backup or retention job for these logs was found.

## Actual standard-backend service and host

`systemctl --user show lanis-api.service` identifies the running service as
working in `~/production/lanis`, launched with `python -m uvicorn api.api:app`
without `--no-access-log`, and `StandardOutput=journal` / `StandardError=inherit`.
The active user service, rather than the repository's optional Docker deployment
or the fallback shell launcher in `deploy.sh`, determines the published wording.

`systemd-analyze cat-config systemd/journald.conf` shows:

- `/usr/lib/systemd/journald.conf.d/40-rpi-volatile-storage.conf` sets
  `Storage=volatile` (journal in `/run/log/journal`).
- No explicit `MaxRetentionSec`, `RuntimeMaxUse`, or `RuntimeKeepFree` override.
  Thus there is no configured day-based expiry; the journal's runtime space
  limits govern removal of older archived entries.
- The default `MaxFileSec=1month` is a file-rotation setting, not a promise that
  entries are deleted after one month.
- `ForwardToSyslog=yes`, but rsyslog is inactive and no rsyslog configuration is
  installed. No separate syslog file retention was identified.

A host reboot loses the volatile journal; restarting just the API does not.
The application's account-deletion endpoint does not delete journal entries.
No dedicated journal backup was found in the inspected user/system timers,
user crontab, or application code. The public text deliberately describes the
absence of **application-created** backups rather than making a claim about
all possible infrastructure snapshots or external providers' storage.

The separate `lanis-usage.service` samples CPU/RAM and aggregate data-directory
size with a 90-day file cleanup. It does not capture individual requests or
account identities and is not the account-linked usage statistics store.

Recheck this disclosure if service logging, journal persistence/limits,
forwarding, or backups change. This record does not establish retention of
independent hosting/CDN providers' own logs.
