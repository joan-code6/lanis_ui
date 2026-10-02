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

ReactDOM.createRoot(appRoot).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch((error) => {
      console.warn('Service worker registration failed:', error)
    })
  })
}
