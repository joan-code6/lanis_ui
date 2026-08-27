import uiConfig from './config.json'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: uiConfig.port,
    host: uiConfig.host,
    proxy: {
      '/api': {
        target: uiConfig.apiUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    port: uiConfig.port,
    host: uiConfig.host,
  },
})
