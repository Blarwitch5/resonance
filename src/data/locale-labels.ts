import type { Locale } from '../i18n/config'
import { locales } from '../i18n/config'

/** Labels pour chaque locale (nom de la langue), réutilisable pour select / liste */
export const localeLabels: Record<(typeof locales)[number], string> = {
  en: 'English',
  fr: 'Français',
} as const

export type LocaleLabel = (typeof localeLabels)[Locale]
