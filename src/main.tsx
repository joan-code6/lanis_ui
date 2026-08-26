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

ReactDOM.createRoot(document.getElementById('root')!).render(
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
