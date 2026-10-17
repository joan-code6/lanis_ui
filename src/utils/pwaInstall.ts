export type InstallAvailability =
  | 'native'
  | 'ios-safari'
  | 'ios-browser'
  | 'macos-safari'
  | 'ios-other-browser'
  | 'unsupported'
  | 'installed';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(listener => listener());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

export const subscribeToInstallAvailability = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getDeferredInstallPrompt = () => deferredPrompt;

export const clearDeferredInstallPrompt = () => {
  deferredPrompt = null;
  notify();
};

export const isStandaloneMode = () => (
  window.matchMedia('(display-mode: standalone)').matches
  || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
);

const isIosDevice = () => {
  const navigatorWithTouchPoints = window.navigator as Navigator & { maxTouchPoints?: number };
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
    || (window.navigator.platform === 'MacIntel' && (navigatorWithTouchPoints.maxTouchPoints || 0) > 1);
};

const isSafari = () => {
  const userAgent = window.navigator.userAgent;
  return /Version\/[\d.]+.*Safari/i.test(userAgent)
    && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(userAgent);
};

const supportsThirdPartyIosInstall = () => {
  const version = /OS (\d+)[_.](\d+)/i.exec(window.navigator.userAgent);
  if (version) {
    const major = Number(version[1]);
    const minor = Number(version[2]);
    return major > 16 || (major === 16 && minor >= 4);
  }

  // iPadOS can request a desktop user agent that omits its OS version.
  // Push API support arrived with the same iPadOS 16.4 release that enabled
  // Add to Home Screen for third-party browsers, so it is a useful capability
  // signal when the version is unavailable.
  return window.navigator.platform === 'MacIntel'
    && window.navigator.maxTouchPoints > 1
    && 'PushManager' in window;
};

const isMacSafari = () => (
  isSafari()
  && /Macintosh/i.test(window.navigator.userAgent)
  && !window.navigator.maxTouchPoints
);

export const getInstallAvailability = (): InstallAvailability => {
  if (isStandaloneMode()) return 'installed';
  if (deferredPrompt) return 'native';
  if (isIosDevice()) {
    if (isSafari()) return 'ios-safari';
    return supportsThirdPartyIosInstall() ? 'ios-browser' : 'ios-other-browser';
  }
  // Safari does not expose the host macOS version. Safari 17 also runs on
  // Monterey and Ventura, while Add to Dock requires Sonoma or newer, so this
  // state is informational only and must not enable automatic promotion.
  if (isMacSafari()) return 'macos-safari';
  return 'unsupported';
};
