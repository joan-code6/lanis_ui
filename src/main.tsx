import AppErrorBoundary from './components/android/AppErrorBoundary'
import '@fortawesome/fontawesome-free/css/all.min.css'
import '@fortawesome/fontawesome-free/css/v4-shims.min.css'
import '@fontsource/outfit/latin-400.css'
import '@fontsource/outfit/latin-500.css'
import '@fontsource/outfit/latin-600.css'
import '@fontsource/outfit/latin-700.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import { isAndroid, androidPresentation } from './platform/native'
import { restoreNativeSession } from './platform/authStorage'
import { getApiBaseUrl } from './utils/backendConfig'
import React from 'react'
import ReactDOM from 'react-dom/client'
import '@khmyznikov/pwa-install'
import App from './App.tsx'
import './index.css'
import { CUSTOM_BACKEND_STORAGE_KEY } from './utils/backendConfig.ts'

window.addEventListener('storage', (event) => {
  if (
    event.key === CUSTOM_BACKEND_STORAGE_KEY
    && event.oldValue !== event.newValue
  ) {
    window.location.reload()
  }
})

const appRoot = document.getElementById('root')!
const bootObserver = new MutationObserver((mutations) => {
  // Keep the cover during redirects, which can briefly leave the root empty.
  if (mutations.some((mutation) => mutation.target === appRoot) && appRoot.childElementCount > 0) {
    document.documentElement.classList.remove('js-booting')
    bootObserver.disconnect()
  }
})
bootObserver.observe(appRoot, { childList: true })

async function start() {
  if (androidPresentation) document.documentElement.classList.add('android-app');
  if (isAndroid) {
    try { await restoreNativeSession(getApiBaseUrl()); }
    catch {
      // Do not silently erase credentials if the device vault is temporarily unavailable.
      const root = document.getElementById('root')!;
      root.replaceChildren();
      const panel = document.createElement('div');
      panel.style.cssText = 'padding:32px;max-width:480px;margin:48px auto;font-family:system-ui';
      const title = document.createElement('h1'); title.textContent = 'Anmeldung konnte nicht geladen werden';
      const text = document.createElement('p'); text.textContent = 'Entsperre dein Gerät und versuche es erneut. Deine gespeicherten Daten bleiben erhalten.';
      const retry = document.createElement('button'); retry.textContent = 'Erneut versuchen'; retry.onclick = () => window.location.reload();
      panel.append(title, text, retry); root.append(panel); return;
    }
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><AppErrorBoundary><App /></AppErrorBoundary></React.StrictMode>,
  );
}
void start();

if (!isAndroid && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch((error) => {
      console.warn('Service worker registration failed:', error)
    })
  })
}
