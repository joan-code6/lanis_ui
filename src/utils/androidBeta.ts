export function isAndroidBrowser(userAgent: string, capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string }): boolean {
  return /Android/i.test(userAgent) && !capacitor?.isNativePlatform?.() && capacitor?.getPlatform?.() !== 'android';
}
export function betaPrompt(state: { available: boolean; status: string; approval_unseen: boolean; invitation_due: boolean }): 'approval' | 'invitation' | null {
  if (!state.available) return null;
  if (state.status === 'approved' && state.approval_unseen) return 'approval';
  return state.status === 'none' && state.invitation_due ? 'invitation' : null;
}
