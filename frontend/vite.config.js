import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_ENDPOINT,
        changeOrigin: true,
        secure: false,
      }
    },
    hmr: {
      path: process.env.VITE_WS_PATH, 
    },
  }
})
