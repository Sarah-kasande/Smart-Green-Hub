import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
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