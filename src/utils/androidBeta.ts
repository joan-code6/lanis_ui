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
