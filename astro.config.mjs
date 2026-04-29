// @ts-check

import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [],
  image: {
    domains: [
      'i.discogs.com',
      'img.discogs.com',
      'api.discogs.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.discogs.com',
      },
    ],
  },
  // Désactiver temporairement le prefetch pour éviter les erreurs de cache
  prefetch: false,
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['@lucide/astro'],
    },
    ssr: {
      noExternal: ['@lucide/astro'],
      external: ['bcryptjs'],
    },
    build: {
      rollupOptions: {
        external: ['bcryptjs'],
      },
    },
    cacheDir: '.vite',
    resolve: {
      preserveSymlinks: false,
    },
    server: {
      fs: {
        allow: ['..', '../packages'],
        strict: false,
      },
      hmr: {
        overlay: false,
        clientPort: 4321,
      },
      watch: {
        ignored: ['**/.astro/**', '**/node_modules/**', '**/.vite/**', '**/dist/**'],
        usePolling: false,
        interval: 100,
      },
    },
  },
})
