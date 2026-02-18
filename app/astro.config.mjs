// @ts-check

import node from '@astrojs/node'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [],
  // Désactiver temporairement le prefetch pour éviter les erreurs de cache
  prefetch: false,
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['lucide-astro', '@lucide/astro'],
    },
    ssr: {
      noExternal: ['lucide-astro', '@lucide/astro'],
    },
    cacheDir: '.vite',
    // Résoudre le problème de casse sur macOS
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
      },
      watch: {
        ignored: ['**/.astro/**', '**/node_modules/**', '**/.vite/**', '**/dist/**'],
        usePolling: false,
        interval: 100,
      },
    },
  },
})
