import react from '@vitejs/plugin-react'
import { env } from 'node:process'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const [repositoryOwner, repositoryName] = env.GITHUB_REPOSITORY?.split('/') ?? []
const isUserPagesRepository = repositoryName?.toLowerCase() === `${repositoryOwner?.toLowerCase()}.github.io`
const isCapacitorBuild = env.CAPACITOR_BUILD === 'true'
const base = !isCapacitorBuild && env.GITHUB_ACTIONS === 'true' && repositoryName && !isUserPagesRepository
  ? `/${repositoryName}/`
  : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      base,
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'pwa-icon.svg',
        'apple-touch-icon-180x180.png',
        'maskable-icon-512x512.png',
      ],
      manifest: {
        id: base,
        name: 'Moment — wspomnienia',
        short_name: 'Moment',
        description: 'Prywatny dziennik wspomnień.',
        lang: 'pl',
        theme_color: '#f8f9fc',
        background_color: '#f8f9fc',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: base,
        scope: base,
        icons: [
          { src: `${base}pwa-64x64.png`, sizes: '64x64', type: 'image/png' },
          { src: `${base}pwa-192x192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}pwa-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: `${base}maskable-icon-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
})
