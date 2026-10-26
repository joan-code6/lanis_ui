import { notificationsAPI } from '../services/api';

export interface BrowserPushRepairState { renewalPending: boolean }
export type BrowserPushRepairResult = 'registered' | 'inactive' | 'retry' | 'cancelled';

/** Repair an opted-in browser without asking permission or enabling a new device. */
export async function repairBrowserPushRegistration(
  token: string,
  signal: AbortSignal,
  isCurrent: () => boolean,
  state: BrowserPushRepairState = { renewalPending: false },
): Promise<BrowserPushRepairResult> {
  const current = () => !signal.aborted && isCurrent();
  if (!current()) return 'cancelled';
  if (!('Notification' in window) || Notification.permission !== 'granted'
    || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'inactive';

  const registration = await navigator.serviceWorker.getRegistration();
  if (!current()) return 'cancelled';
  if (!registration) return 'inactive';
  let subscription = await registration.pushManager.getSubscription();
  if (!current()) return 'cancelled';
  if (!subscription && !state.renewalPending) return 'inactive';

  const [config, preferences] = await Promise.all([
    notificationsAPI.getConfig(token, signal),
    notificationsAPI.getPreferences(token, signal),
  ]);
  if (!current()) return 'cancelled';
  if (!config.success || !preferences.success) return 'retry';
  if (!config.configured || !preferences.preferences.enabled) return 'inactive';
  if (!config.public_key) return 'retry';

  const encoded = config.public_key.replace(/-/g, '+').replace(/_/g, '/');
  const key = Uint8Array.from(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')), char => char.charCodeAt(0));
  if (key.byteLength !== 65 || key[0] !== 4) throw new Error('Ungültiger Push-Schlüssel vom Server.');
  const storedKey = subscription?.options.applicationServerKey;
  const matches = storedKey && storedKey.byteLength === key.byteLength
    && new Uint8Array(storedKey).every((value, index) => value === key[index]);
  if (!matches) {
    // The existing subscription establishes that this device already opted in.
    // Rebind it when the server's signing key changes, without changing consent.
    state.renewalPending = true;
    if (subscription) await subscription.unsubscribe();
    if (!current()) return 'cancelled';
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  }
  if (!current()) return 'cancelled';
  if (!subscription) return 'retry';
  const payload = subscription.toJSON();
  if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys.auth) return 'retry';
  const response = await notificationsAPI.registerSubscription(token, {
    endpoint: payload.endpoint,
    keys: { p256dh: payload.keys.p256dh, auth: payload.keys.auth },
  }, signal);
  if (!current()) return 'cancelled';
  if (!response.success) return 'retry';
  state.renewalPending = false;
  return 'registered';
}
