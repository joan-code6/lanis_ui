import { isAndroid, LanisNative, type NativeSession } from './native';

const keys = ['auth_access_token', 'auth_refresh_token', 'auth_expires_at', 'auth_user', '__lanis_account_deletion_recovery'];
let values: NativeSession = {};
let writes: Promise<void> = Promise.resolve();
let persistenceError: unknown;
let backend = '';

export async function restoreNativeSession(apiBaseUrl: string): Promise<void> {
  if (!isAndroid) return;
  backend = apiBaseUrl;
  const restored = await LanisNative.getSession();
  if (restored.backend && restored.backend !== apiBaseUrl) {
    await LanisNative.clearSession();
    values = {};
  } else values = restored.values;
  // Android credentials live in the Keystore-backed vault, never WebView storage.
  keys.forEach(key => localStorage.removeItem(key));
}

function persist(): void {
  const snapshot = { ...values };
  writes = writes.then(async () => {
    try {
      await LanisNative.saveSession({ values: snapshot, backend });
      persistenceError = undefined;
    } catch (error) { persistenceError = error; }
  });
}

export const authStorage = {
  getItem(key: string): string | null {
    return isAndroid ? values[key] ?? null : localStorage.getItem(key);
  },
  setItem(key: string, value: string): void {
    if (!isAndroid) { localStorage.setItem(key, value); return; }
    values[key] = value;
    persist();
  },
  removeItem(key: string): void {
    if (!isAndroid) { localStorage.removeItem(key); return; }
    delete values[key];
    persist();
  },
};

export async function flushAuthStorage(): Promise<void> {
  await writes;
  if (persistenceError) throw new Error('Die Anmeldung konnte nicht sicher gespeichert werden. Bitte erneut versuchen.');
}

export async function clearNativeSession(preserveDeletionRecovery = false): Promise<void> {
  if (!isAndroid) return;
  const recoveryKey = '__lanis_account_deletion_recovery';
  const recovery = preserveDeletionRecovery ? values[recoveryKey] : undefined;
  values = recovery ? { [recoveryKey]: recovery } : {};
  const snapshot = { ...values };
  writes = writes.then(async () => {
    try {
      await LanisNative.clearSession();
      if (recovery) await LanisNative.saveSession({ values: snapshot, backend });
      persistenceError = undefined;
    } catch (error) { persistenceError = error; }
  });
  await flushAuthStorage();
}

export async function reloadNativeCredentials(): Promise<void> {
  if (isAndroid) { await writes; values = (await LanisNative.getSession()).values; }
}
