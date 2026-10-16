import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Blocks stray PostCSS config files outside the project (Tailwind v4 runs through its Vite plugin).
  css: { postcss: { plugins: [] } },
  server: {
    // Local development: the browser calls /api on the Vite server, which forwards to the API.
    // Same idea as the Vercel rewrite in production, so the login cookie is always first-party.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Page navigations fall back to the app shell, but never /api: API calls always go to the network
        // and authenticated responses are never cached (NFR04).
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'Smart Green Hub',
        short_name: 'Green Hub',
        theme_color: '#1B3350',
        background_color: '#F5F6F8',
        display: 'standalone',
        icons: []
      }
    })
  ]
})
