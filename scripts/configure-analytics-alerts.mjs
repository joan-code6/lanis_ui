// No secret is printed or written. Default mode is a reviewable plan; --apply mutates PostHog.
import { pathToFileURL } from 'node:url';
export function alertDefinitions(webhook) {
  if (!/^https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(webhook)) throw new Error('A valid HTTPS Discord webhook is required');
  return ['spiking', 'reopened'].map(trigger => ({
    type: 'internal_destination', template_id: 'template-discord',
    name: `LANIS issue ${trigger} · Discord (auto)`, enabled: true,
    description: 'LANIS error tracking lifecycle alert. Generic message; no account identity, raw error details or mentions.',
    filters: { events: [{ id: `$error_tracking_issue_${trigger}`, type: 'events' }] },
    inputs: { webhookUrl: { value: webhook }, content: { value: `LANIS: an error issue ${trigger === 'spiking' ? 'is spiking' : 'has returned after resolution'}. Investigate: https://eu.posthog.com/project/214484/error_tracking/` }, allowedMentions: { value: 'none' } },
  }));
}
async function main() {
  if (!process.argv.includes('--apply')) {
    console.log('Plan: two enabled Discord alerts: issue spiking and issue reopened. No raw error/account data or mentions. Apply with POSTHOG_API_KEY and DISCORD_ANALYTICS_WEBHOOK in the environment.');
    return;
  }
  const key = process.env.POSTHOG_API_KEY;
  if (!key?.startsWith('phx_')) throw new Error('POSTHOG_API_KEY with hog_function read/write is required');
  const definitions = alertDefinitions(process.env.DISCORD_ANALYTICS_WEBHOOK || '');
  const root = 'https://eu.posthog.com/api/projects/214484/hog_functions/';
  const request = async (url, body) => {
    if (!url.startsWith(root)) throw new Error('Unexpected pagination destination');
    const result = await fetch(url, { method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!result.ok) throw new Error(`PostHog configuration failed (HTTP ${result.status}); check management scopes`);
    return result.json();
  };
  const existing = []; let next = root + '?type=internal_destination&limit=1000';
  while (next) { const page = await request(next); existing.push(...page.results); next = page.next; }
  for (const definition of definitions) {
    const event = definition.filters.events[0].id;
    const candidates = existing.filter(item => item.filters?.events?.some(item => item.id === event));
    let matched = false;
    for (const candidate of candidates) {
      const detail = await request(root + encodeURIComponent(candidate.id) + '/');
      const destination = detail.inputs?.webhookUrl?.value;
      if (!destination) throw new Error('An existing lifecycle alert has a hidden destination; review it before adding another');
      if (destination === definition.inputs.webhookUrl.value) {
        if (!detail.enabled) throw new Error('A matching alert exists but is disabled; review before enabling');
        matched = true;
      }
    }
    if (matched) console.log(`Already configured: ${definition.name}`);
    else { await request(root, definition); console.log(`Configured: ${definition.name}`); }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
