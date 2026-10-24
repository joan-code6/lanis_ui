import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import posthog from '@posthog/rollup-plugin'

export default defineConfig({
  plugins: [react(), ...(process.env.POSTHOG_API_KEY ? [posthog({
    personalApiKey: process.env.POSTHOG_API_KEY,
    projectId: '214484', host: 'https://eu.posthog.com',
    sourcemaps: { enabled: true, releaseName: 'lanis-ui', releaseVersion: process.env.VITE_APP_RELEASE, deleteAfterUpload: true, releaseMode: 'symbol-set' },
  })] : [])],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})