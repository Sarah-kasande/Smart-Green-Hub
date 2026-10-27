import process from 'node:process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Blocks stray PostCSS config files outside the project (Tailwind v4 runs through its Vite plugin).
  css: { postcss: { plugins: [] } },
  // '@/...' means 'src/...' (used by the shadcn/ui components)
  resolve: { alias: { '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src') } },
  // The git commit Vercel builds (VERCEL_GIT_COMMIT_SHA). Only used for a console note in development.
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7)),
  },
  // Pre-bundle the UI libraries when the dev server starts. Without this, Vite finds some of them only
  // when a lazy page opens, re-bundles and reloads the page (slow first visit, flaky tests).
  optimizeDeps: {
    include: ['radix-ui', 'cmdk', 'vaul', 'sonner', 'recharts', 'lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge', 'react-leaflet', 'leaflet', 'dexie'],
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
      // 'prompt' = a new version waits until src/pwa.js switches it on (at the next page change).
      // No prompt is ever shown to the person.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      workbox: {
        // The app shell (HTML, JS, CSS, icons) is precached so the app opens offline.
        // Page navigations fall back to the app shell, but never /api: API calls always go to the
        // network and authenticated responses are never cached by the service worker (NFR04).
        // The app shell and the self-hosted font (woff2) are precached so the app looks right offline.
        // Photos are NOT precached (too large to install); they are cached the first time they are seen.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Landing-page photos (public/photos): kept after the first visit, for 30 days
            urlPattern: ({ url }) => url.pathname.startsWith('/photos/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'photos',
              expiration: { maxEntries: 40, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
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
        display_override: ['standalone', 'minimal-ui'],
        // Long-press the app icon on the phone: jump straight to the most used actions
        shortcuts: [
          { name: 'Add batch', short_name: 'Add batch', url: '/operator/batches/new', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Record sale', short_name: 'Sale', url: '/operator/sales?tab=sale', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Surplus Board', short_name: 'Board', url: '/institution/board', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
