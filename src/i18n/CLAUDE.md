# i18n — Module Guide

## Structure

Two supported locales: `fr` (default) and `en`.
Locale is stored in a cookie (`locale`) and in `userPreferences.locale` for authenticated users.

## config.ts
```ts
import { normalizeLocale } from '../i18n/config'
// type Locale = 'fr' | 'en'
// normalizeLocale(raw) → 'fr' | 'en' (falls back to 'fr')
```

## Pattern

Each page/component imports only the translation file it needs:
```ts
import { itemsI18n } from '../../i18n/items'
const locale = normalizeLocale(Astro.cookies.get('locale')?.value ?? ...)
const t = itemsI18n[locale]
```

Translation files export `Record<Locale, T>` where T is an object of strings or functions.

## Files

| File | Used by |
|---|---|
| `layout.ts` | Layout.astro, DashboardLayout.astro — nav labels, generic UI |
| `items.ts` | `/pages/items/[id].astro` — item detail page |
| `library.ts` | `/pages/library.astro` — shelf/library page |
| `collections.ts` | `/pages/collections/` — collection pages |
| `explore.ts` / `explorer.ts` | `/pages/explorer*` — discovery pages |
| `feed.ts` | `/pages/feed.astro` — activity feed |
| `profile.ts` | `/pages/u/[username].astro` — public profile |
| `home.ts` | `/pages/index.astro` — homepage |
| `notifications.ts` | `/pages/notifications.astro` |
| `settings.ts` | `/pages/settings.astro` |
| `login.ts` / `signup.ts` | Auth pages |
| `forgotPassword.ts` / `resetPassword.ts` | Password reset pages |
| `onboarding.ts` | `/pages/onboarding.astro` |
| `static-pages.ts` | About, help, contact |

## Rules
- Zero emoji in translation strings — use Lucide icons in the template instead
- Function translations (e.g. `t.friendsHaveIt(count)`) return a string with interpolation
- No HTML in translation strings — plain text only
