# Styles — Module Guide

## Stack
Tailwind CSS v4 via `@tailwindcss/vite`. No Tailwind config file — configuration is in CSS.

## Files

### `theme.css` — design tokens (`@theme`)
Defines CSS custom properties consumed by Tailwind as utility classes.
Key token groups:
- `--color-background` / `--color-surface` / `--color-surface-raised` — page backgrounds
- `--color-border` — borders
- `--color-text-primary` / `--color-text-muted` — text
- `--color-accent` — primary brand color (violet `#6B4EFF`)
- `--color-success` / `--color-error` / `--color-warning` — status colors

### `design-tokens.css` — component tokens
Higher-level tokens built on top of `theme.css`.
Button, card, input, badge base styles.

### `global.css` — base styles
- Imports `theme.css` and `design-tokens.css`
- Tailwind base/utilities directives
- Global resets and typography

## Theme switching
Dark/light mode is controlled via `data-theme` on `<html>`.
Tokens are defined in `:root` (dark default) and `[data-theme="light"]` overrides.
Theme is stored in `localStorage` and applied before paint via inline script in Layout.astro.

## Conventions
- Use design tokens (`text-muted`, `bg-surface`, `border-border`) over raw colors
- Never hardcode hex colors in templates — use token utilities
- Font: self-hosted (in `public/fonts/`), loaded in `global.css`
