import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 7200,
  },
  // Use root path for local dev, /SoloMind/system/ for production (GitHub Pages)
  base: mode === 'production' ? '/SoloMind/system/' : '/',
}))
