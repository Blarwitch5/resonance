export const locales = ['en', 'fr'] as const

export type Locale = (typeof locales)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export function normalizeLocale(raw: string | null | undefined): Locale {
  if (!raw) return DEFAULT_LOCALE
  const value = raw.toLowerCase()
  return (locales as readonly string[]).includes(value) ? (value as Locale) : DEFAULT_LOCALE
}

