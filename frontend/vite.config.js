import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Blocks stray PostCSS config files outside the project (Tailwind v4 runs through its Vite plugin).
  css: { postcss: { plugins: [] } },
  // The git commit Vercel builds (VERCEL_GIT_COMMIT_SHA), compared with the API's version in the app
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7)),
  },
  server: {
    // Local development: the browser calls /api on the Vite server, which forwards to the API.
    // Same idea as the Vercel rewrite in production, so the login cookie is always first-party.
    // VITE_PROXY_TARGET lets the end-to-end tests use a separate API on another port.
    proxy: {
      '/api': process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      workbox: {
        // The app shell (HTML, JS, CSS, icons) is precached so the app opens offline.
        // Page navigations fall back to the app shell, but never /api: API calls always go to the
        // network and authenticated responses are never cached by the service worker (NFR04).
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // OpenStreetMap tiles: public images, cached so recently seen maps show offline
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Smart Green Hub',
        short_name: 'Green Hub',
        description: 'Predict, redirect and plan surplus plants for Kigali nurseries.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1B3350',
        background_color: '#F5F6F8',
        categories: ['productivity', 'business'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
