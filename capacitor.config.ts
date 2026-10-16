import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.lanis.app',
  appName: 'LANIS',
  webDir: 'dist-android',
  backgroundColor: '#0a0a0a',
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  server: { androidScheme: 'https', hostname: 'localhost' },
  plugins: {
    // MainActivity owns both system-bar and IME insets.
    SystemBars: { insetsHandling: 'disable' },
    CapacitorHttp: { enabled: true },
    CapacitorCookies: { enabled: true },
  },
};

export default config;
