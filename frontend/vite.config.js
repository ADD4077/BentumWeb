import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const allowedHosts = (process.env.VITE_ALLOWED_HOSTS || 'localhost,127.0.0.1,app')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://server:1337',
        changeOrigin: true,
        secure: false,
      },
      '/media': {
        target: process.env.VITE_API_URL || 'http://server:1337',
        changeOrigin: true,
        secure: false,
      }
    },
    hmr: false
  }
})
