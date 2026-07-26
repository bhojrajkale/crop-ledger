import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Served from https://<user>.github.io/crop-ledger/, so every asset URL and
// the router basename hang off this. Keep the trailing slash.
export default defineConfig({
  base: '/crop-ledger/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Crop Ledger',
        short_name: 'Crop Ledger',
        description: 'Track farm expenses and settle up by crop.',
        theme_color: '#4a7c3f',
        background_color: '#faf8f4',
        display: 'standalone',
        start_url: '/crop-ledger/',
        scope: '/crop-ledger/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
