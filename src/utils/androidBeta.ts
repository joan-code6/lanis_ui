export function isAndroidBrowser(userAgent: string, capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string }): boolean {
  return /Android/i.test(userAgent) && !capacitor?.isNativePlatform?.() && capacitor?.getPlatform?.() !== 'android';
}
export function betaPrompt(state: { available: boolean; invitation_due: boolean }): 'invitation' | null {
  return state.available && state.invitation_due ? 'invitation' : null;
}

// Google hosts account selection and joining; LANIS receives no Google credentials.
export function googleGroupJoinUrl(groupUrl: string): string {
  return `https://accounts.google.com/AccountChooser?hl=de&continue=${encodeURIComponent(groupUrl)}`;
}

const JOIN_INTENT_KEY = 'lanis_join_beta_requested';
let joinIntent = false;

export function rememberBetaJoin(): void {
  joinIntent = true;
  try { sessionStorage.setItem(JOIN_INTENT_KEY, '1'); } catch { /* Keep the in-memory intent through SPA login. */ }
}
export function hasPendingBetaJoin(): boolean {
  try { return joinIntent || sessionStorage.getItem(JOIN_INTENT_KEY) === '1'; } catch { return joinIntent; }
}
export function consumeBetaJoin(): void {
  joinIntent = false;
  try { sessionStorage.removeItem(JOIN_INTENT_KEY); } catch { /* Storage may be unavailable. */ }
}
