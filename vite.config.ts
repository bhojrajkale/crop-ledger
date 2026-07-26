import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync('./package.json', 'utf8')) as {
  version: string
}

/**
 * Short commit of the build, shown in Settings. Without it there is no way to
 * tell a stale cached app from a current one, which is exactly the confusion
 * this stamp exists to end. CI provides GITHUB_SHA; local builds fall back to
 * git, and anything without either is honestly labelled rather than guessed.
 */
function buildSha(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short=7 HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

// Served from https://<user>.github.io/crop-ledger/, so every asset URL and
// the router basename hang off this. Keep the trailing slash.
export default defineConfig({
  base: '/crop-ledger/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_SHA__: JSON.stringify(buildSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt', not 'autoUpdate': a silent background swap meant a deploy
      // only appeared on some later reload, with no way to tell whether you
      // were looking at the new build. Now the app asks before reloading.
      registerType: 'prompt',
      // Registration is done by the React hook in UpdatePrompt, so the
      // generated script must not also register and race it.
      injectRegister: null,
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
