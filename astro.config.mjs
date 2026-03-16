// @ts-check

import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [],
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
