/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    screens: {
      xs: '360px',
      'xs-lg': '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Couleurs Resonance - Thème clair
        'night-deep': 'var(--color-night-deep)',
        'electric-purple': 'var(--color-electric-purple)',
        'copper-warm': 'var(--color-copper-warm)',
        'blue-gray': 'var(--color-blue-gray)',
        'cream-white': 'var(--color-cream-white)',

        // Couleurs système
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        'surface-overlay': 'var(--color-surface-overlay)',
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        neutral: 'var(--color-neutral)',
        border: 'var(--color-border)',
        muted: 'var(--color-muted)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',

        // Couleurs de format
        'format-vinyl': 'var(--color-format-vinyl)',
        'format-cassette': 'var(--color-format-cassette)',
        'format-cd': 'var(--color-format-cd)',
        'format-explorer': 'var(--color-format-explorer)',
        'format-profile': 'var(--color-format-profile)',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
