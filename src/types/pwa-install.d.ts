interface PwaInstallElement extends HTMLElement {
  showDialog(forced?: boolean): void;
  hideDialog(): void;
  install(): void;
  getInstalledRelatedApps(): Promise<unknown[]>;
  isUnderStandaloneMode: boolean;
  isInstallAvailable: boolean;
  isAppleMobilePlatform: boolean;
  isAppleDesktopPlatform: boolean;
  isApple26Plus: boolean;
  isAndroid: boolean;
  isAndroidFallback: boolean;
  isDialogHidden: boolean;
  isRelatedAppsInstalled: boolean;
  userChoiceResult: string;
  useLocalStorage: boolean;
  manifestUrl: string;
  icon: string;
  name: string;
  description: string;
  installDescription: string;
  disableDescription: boolean;
  disableScreenshots: boolean;
  disableScreenshotsApple: boolean;
  disableScreenshotsChrome: boolean;
  manualApple: boolean;
  manualChrome: boolean;
  manualHowTo: boolean;
  disableChrome: boolean;
  disableClose: boolean;
  disableFallback: boolean;
  styles: Record<string, string>;
  externalPromptEvent: BeforeInstallPromptEvent | null;
  platforms: string[];
}

declare namespace React.JSX {
  interface IntrinsicElements {
    'pwa-install': React.DetailedHTMLProps<React.HTMLAttributes<PwaInstallElement>, PwaInstallElement> & {
      ref?: React.Ref<PwaInstallElement>;
      'manifest-url'?: string;
      'manual-apple'?: 'true' | 'false';
      'manual-chrome'?: 'true' | 'false';
      'disable-chrome'?: 'true' | 'false';
      'disable-android-fallback'?: 'true' | 'false';
      'use-local-storage'?: 'true' | 'false';
      name?: string;
      icon?: string;
      description?: string;
      'install-description'?: string;
    };
  }
}
