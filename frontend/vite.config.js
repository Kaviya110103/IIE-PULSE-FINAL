import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const parseAllowedHosts = () => {
  const hosts = process.env.VITE_ALLOWED_HOSTS
  return hosts
    ? hosts.split(',').map(host => host.trim()).filter(Boolean)
    : ['iiepulse.indrainstitute.com', 'www.iiepulse.indrainstitute.com', 'localhost', '127.0.0.1']
}

// Local development must never fall through to the production API.
const localBackend = 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: Number(process.env.VITE_PORT || 5173),
    allowedHosts: parseAllowedHosts(),
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || localBackend,
        changeOrigin: true,
      },
      '/media': {
        target: process.env.VITE_API_PROXY_TARGET || localBackend,
        changeOrigin: true,
      },
    },
  },

  preview: {
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: parseAllowedHosts(),
  }
})
