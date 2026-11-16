// Reproducible report definitions only. No credentials, network requests or live mutations.
// node scripts/analytics-growth-reports.mjs > /tmp/lanis-growth-reports.json
const app = { key: 'app', value: 'lanis_ui', operator: 'exact', type: 'event' };
const account = { key: 'identity_kind', value: 'account', operator: 'exact', type: 'event' };
const event = (id, order, extra = []) => ({ id, name: id, type: 'events', order, properties: [app, ...extra] });
const sql = query => ({ kind: 'DataTableNode', source: { kind: 'HogQLQuery', query } });
const reports = [
 { name: 'LANIS acquisition · consenting browsers and accounts', query: {
   kind: 'InsightVizNode', source: { kind: 'TrendsQuery', dateRange: { date_from: '-30d' },
     series: [event('$pageview', 0)], properties: [app],
     breakdownFilter: { breakdowns: [{ property: 'session_source', type: 'event' }, { property: 'identity_kind', type: 'event' }] },
     trendsFilter: { display: 'ActionsLineGraph' } } },
   note: 'Set aggregation to unique users in PostHog for browser/person reach; event volume is pageviews. Anonymous and identified reach overlap and must not be added.' },
 { name: 'LANIS first use · login to useful content to action', query: {
   kind: 'InsightVizNode', source: { kind: 'FunnelsQuery', dateRange: { date_from: '-30d' }, properties: [app],
     series: [event('login_started',0), event('login_succeeded',1), event('account_content_ready',2,[account]), event('feature_engaged',3,[account])],
     funnelsFilter: { funnelWindowInterval: 1, funnelWindowIntervalUnit: 'hour', funnelOrderType: 'ordered', funnelVizType: 'steps' } } },
   note: 'Person identity merges consenting anonymous attempts. Break down by first_source; it is browser-first observation, not verified account acquisition. Repeated logins, late consent and unavailable identity cause omissions. Keep onboarding as a separate optional branch.' },
 { name: 'LANIS first observed useful experience · return by source', query: sql(`WITH useful AS (
 SELECT timestamp, properties.account_ref AS account, coalesce(properties.first_source, 'unknown') AS source
 FROM events WHERE event = 'account_content_ready' AND properties.app = 'lanis_ui'
 AND properties.identity_kind = 'account' AND match(properties.account_ref, '^la_[a-f0-9]{32}$')
), first_use AS (
 SELECT account, min(timestamp) AS first_at, argMin(source, timestamp) AS source FROM useful GROUP BY account
), returns AS (
 SELECT f.account AS account, f.source AS source, f.first_at AS first_at,
 max(if(dateDiff('day', toStartOfDay(f.first_at), toStartOfDay(u.timestamp)) = 1, 1, 0)) AS day1,
 max(if(dateDiff('day', toStartOfDay(f.first_at), toStartOfDay(u.timestamp)) BETWEEN 1 AND 7, 1, 0)) AS days1_7
 FROM first_use f JOIN useful u ON f.account = u.account
 GROUP BY f.account, f.source, f.first_at
)
SELECT source, count() AS eligible_accounts, sum(day1) AS returned_day1, sum(days1_7) AS returned_days1_7,
 round(100.0 * sum(day1) / count(), 1) AS day1_percent,
 round(100.0 * sum(days1_7) / count(), 1) AS days1_7_percent
FROM returns WHERE first_at < toStartOfDay(now()) - INTERVAL 7 DAY
GROUP BY source ORDER BY eligible_accounts DESC`),
   note: 'Use UTC project timezone. Includes only cohorts with seven complete later UTC days. First useful means first observed instrumented usable segment, not signup or activation. No UI date filter may truncate the CTE history. Day 1 and days 1–7 are different definitions.' },
 { name: 'LANIS content experience · cache, empty and failures', query: sql(`SELECT properties.resource AS resource, properties.outcome AS outcome, properties.cached AS cached,
 count() AS views, quantile(0.5)(toFloat(properties.duration_ms)) AS p50_ms,
 quantile(0.95)(toFloat(properties.duration_ms)) AS p95_ms
FROM events WHERE properties.app = 'lanis_ui' AND event = 'content_ready' AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY resource, outcome, cached ORDER BY views DESC`), note: 'Views/segments, not unique users. Course/dashboard empty states are explicit; other resources can successfully render an empty result. Separate content_refreshed from first view timing.' },
 { name: 'LANIS auth refresh health · attempts', query: sql(`SELECT toStartOfDay(timestamp) AS day, properties.outcome AS outcome, properties.status AS status, count() AS attempts,
 uniq(properties.account_ref) AS observed_accounts, quantile(0.95)(toFloat(properties.duration_ms)) AS p95_ms
FROM events WHERE properties.app = 'lanis_ui' AND event = 'api_request_completed'
AND properties.endpoint = '/auth/refresh' AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY day, outcome, status ORDER BY day DESC`), note: 'Attempts include retries; this is not final user-visible session failure. Null account refs are not accounts. Compare with login_failed and content failures; do not add backend and browser denominators.' },
];
const weekly = JSON.parse(JSON.stringify(reports[2]));
weekly.name = 'LANIS first observed useful experience · week two return by source';
weekly.query.source.query = weekly.query.source.query.replaceAll('BETWEEN 1 AND 7', 'BETWEEN 7 AND 13').replaceAll('INTERVAL 7 DAY', 'INTERVAL 13 DAY').replaceAll('days1_7', 'days7_13');
weekly.note = 'Return on UTC days 7–13 after first observed useful experience; requires 13 complete later days. Day1 is retained for comparison within the same mature cohort. This is week two return, not rolling seven-day activity.';
reports.push(weekly);
// Use unique persons in the acquisition reach chart; aggregation is explicit.
reports[0].query.source.series[0].math = 'dau';
console.log(JSON.stringify({ project: 214484, app: 'lanis_ui', schema_version: 4, applied_live: false, reports }, null, 2));
