import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return ({
  plugins: [react(), ...(mode === 'android' ? [{
    name: 'android-local-assets',
    transformIndexHtml(html: string) {
      return html.replace(/<link[^>]+(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)[^>]*>/g, '');
    },
  } satisfies Plugin] : [])],
  build: { outDir: mode === 'android' ? 'dist-android' : 'dist' },
  define: mode === 'android' ? { 'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'https://lanis-backend.joancode.dev') } : {},
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
});
})
