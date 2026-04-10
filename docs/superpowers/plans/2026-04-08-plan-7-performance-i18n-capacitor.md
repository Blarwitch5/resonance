# Plan 7 — Performance, i18n & Capacitor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cache headers to public pages, configure Vercel Image Optimization, complete i18n for all new pages/components (EN + FR), set up the Capacitor shell, and wire push notifications via `@capacitor/push-notifications`.

**Architecture:** Cache headers are set directly in Astro page frontmatter via `Astro.response.headers`. Vercel Image is configured in `astro.config.ts`. i18n uses the existing `src/i18n/` system (cookie-based, no URL prefix). Capacitor wraps the Astro app as a native shell — the Astro app runs as-is, Capacitor handles platform APIs.

**Tech Stack:** Astro 6, Vercel Image Optimization (`@astrojs/image`), Capacitor 6, `@capacitor/push-notifications`, `@capacitor/camera`, i18n maison

**Spec:** `docs/superpowers/specs/2026-04-08-social-refactor-design.md` — sections 17, 19, 21, 27

**Depends on:** Plans 1–6 (all pages built)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `astro.config.ts` | Modify | Add Vercel Image Optimization domains |
| `src/i18n/feed.ts` | Create | Feed page i18n strings (EN + FR) |
| `src/i18n/explore.ts` | Create | Explore page i18n strings (EN + FR) |
| `src/i18n/notifications.ts` | Create | Notifications i18n strings |
| `src/i18n/settings.ts` | Create | Settings page i18n strings |
| `src/i18n/onboarding.ts` | Create | Onboarding i18n strings |
| `src/i18n/profile.ts` | Create | Profile page i18n strings |
| `src/i18n/items.ts` | Create | Item detail i18n strings |
| `capacitor.config.ts` | Create | Capacitor configuration |
| `src/capacitor/push.ts` | Create | Push notification registration client |
| `src/capacitor/camera.ts` | Create | Camera / barcode client wrapper |
| `package.json` | Modify | Add Capacitor dependencies |

---

## Task 1: Vercel Image Optimization configuration

**Files:**
- Modify: `astro.config.ts`

- [ ] **Step 1.1: Add allowed image domains for Discogs covers and user avatars**

Read `astro.config.ts`, then add the `image` configuration. Find the `defineConfig({...})` call and add inside it:

```typescript
image: {
  domains: [
    'i.discogs.com',    // Discogs cover images
    'img.discogs.com',  // Discogs alternate CDN
    'api.discogs.com',  // fallback
  ],
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**.discogs.com',
    },
  ],
},
```

After this change, replace raw `<img>` tags for Discogs covers with Astro's `<Image>` component wherever they appear in pages. The most impactful locations are:

- `src/pages/shelf.astro` — shelf grid
- `src/pages/explore.astro` — trending section
- `src/pages/feed.astro` — feed cards

Example replacement:
```astro
---
import { Image } from 'astro:assets'
---

<!-- Before -->
<img src={release.coverUrl} alt={`${release.artist} — ${release.title}`} width="160" height="160" class="w-full aspect-square object-cover" loading="lazy" />

<!-- After -->
{release.coverUrl
  ? <Image src={release.coverUrl} alt={`${release.artist} — ${release.title}`} width={160} height={160} class="w-full aspect-square object-cover" loading="lazy" inferSize={false} />
  : <div class="w-full aspect-square bg-surface-raised" />
}
```

> **Note:** `inferSize={false}` is required for external images to avoid a network request at build time. Always pass explicit `width` and `height`.

- [ ] **Step 1.2: Verify build with image optimization**

```bash
pnpm build 2>&1 | grep -E "(error|Error)" | grep -v "node_modules" | head -20
```

Expected: no errors. If you see "image domain not allowed", the domain config isn't picked up — double-check `astro.config.ts`.

- [ ] **Step 1.3: Commit**

```bash
git add astro.config.ts src/pages/shelf.astro src/pages/explore.astro src/pages/feed.astro
git commit -m "perf(images): configure Vercel Image Optimization for Discogs covers"
```

---

## Task 2: Cache-Control headers on public pages

**Files:**
- Modify: `src/pages/u/[username].astro`
- Modify: `src/pages/explore.astro` (already done in Plan 4 — verify)
- Modify: `src/pages/explore/[discogsId].astro` (already done in Plan 4 — verify)

- [ ] **Step 2.1: Add cache headers to profile page**

In `src/pages/u/[username].astro`, at the end of the frontmatter (after the privacy check), add:

```typescript
// Public profiles: cache for 60s, stale-while-revalidate for 5min
// Private profiles: no-store (already set noindex, should not be cached)
if (!isPrivate) {
  Astro.response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
} else {
  Astro.response.headers.set('Cache-Control', 'no-store')
}
```

- [ ] **Step 2.2: Verify explore pages already have cache headers**

Check `src/pages/explore.astro` and `src/pages/explore/[discogsId].astro` for:
```
Astro.response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
```

If missing, add it. If present, this step is done.

- [ ] **Step 2.3: Verify authenticated pages have `no-store`**

Check `src/pages/feed.astro` and `src/pages/shelf.astro` for:
```
'Cache-Control': 'no-store'
```
The feed API (`/api/feed.ts`) already sets this. The pages themselves don't need it unless they render sensitive data directly — but add it as a defense in depth:

In `src/pages/feed.astro` frontmatter, add:
```typescript
Astro.response.headers.set('Cache-Control', 'no-store')
```

In `src/pages/shelf.astro` frontmatter, add:
```typescript
Astro.response.headers.set('Cache-Control', 'no-store')
```

- [ ] **Step 2.4: Commit**

```bash
git add "src/pages/u/[username].astro" src/pages/feed.astro src/pages/shelf.astro
git commit -m "perf(cache): add Cache-Control headers on public and auth pages"
```

---

## Task 3: i18n — Feed, Explore, Notifications, Settings pages

**Files:**
- Create: `src/i18n/feed.ts`
- Create: `src/i18n/explore.ts`
- Create: `src/i18n/notifications.ts`
- Create: `src/i18n/settings.ts`
- Create: `src/i18n/onboarding.ts`
- Create: `src/i18n/profile.ts`
- Create: `src/i18n/items.ts`

- [ ] **Step 3.1: Check the existing i18n structure**

Read one of the existing i18n files to understand the pattern, for example:

```bash
cat src/i18n/library.ts | head -40
```

The existing files export an object with `fr` and `en` keys. Follow the same pattern.

- [ ] **Step 3.2: Create `src/i18n/feed.ts`**

```typescript
export const feedI18n = {
  fr: {
    title: 'Feed',
    emptyNoFollows: 'Ton feed est vide',
    emptyNoFollowsHint: 'Suis des collectionneurs pour voir leur activité ici.',
    exploreLink: 'Explorer la communauté',
    emptyWithFollows: 'Tes abonnements n\'ont pas encore eu d\'activité.',
    loadMore: 'Charger plus',
    loading: 'Chargement…',
    retry: 'Réessayer',
    activityAddItem: 'a ajouté un disque à sa shelf',
    activityAddWant: 'veut ce disque',
    activityRateItem: 'a noté un disque',
    activityCreateCollection: 'a créé une collection',
    activityAddToCollection: 'a ajouté un disque à une collection',
    activityFollowUser: 'suit quelqu\'un de nouveau',
    likesCount: (n: number) => `${n} like${n !== 1 ? 's' : ''}`,
    commentsCount: (n: number) => `${n} commentaire${n !== 1 ? 's' : ''}`,
  },
  en: {
    title: 'Feed',
    emptyNoFollows: 'Your feed is empty',
    emptyNoFollowsHint: 'Follow collectors to see their activity here.',
    exploreLink: 'Explore the community',
    emptyWithFollows: 'The people you follow haven\'t had any activity yet.',
    loadMore: 'Load more',
    loading: 'Loading…',
    retry: 'Retry',
    activityAddItem: 'added a record to their shelf',
    activityAddWant: 'wants this record',
    activityRateItem: 'rated a record',
    activityCreateCollection: 'created a collection',
    activityAddToCollection: 'added a record to a collection',
    activityFollowUser: 'followed someone new',
    likesCount: (n: number) => `${n} like${n !== 1 ? 's' : ''}`,
    commentsCount: (n: number) => `${n} comment${n !== 1 ? 's' : ''}`,
  },
} as const
```

- [ ] **Step 3.3: Create `src/i18n/explore.ts`**

```typescript
export const exploreI18n = {
  fr: {
    title: 'Explorer',
    searchPlaceholder: 'Artiste, titre, label…',
    noResults: 'Aucun résultat.',
    searchError: 'Erreur de recherche.',
    trending: 'Tendances cette semaine',
    trendingAdds: (n: number) => `${n} ajout${n !== 1 ? 's' : ''}`,
    newMembers: 'Nouveaux membres actifs',
    follow: 'Suivre',
    following: 'Abonné',
    records: (n: number) => `${n} disque${n !== 1 ? 's' : ''}`,
  },
  en: {
    title: 'Explore',
    searchPlaceholder: 'Artist, title, label…',
    noResults: 'No results.',
    searchError: 'Search error.',
    trending: 'Trending this week',
    trendingAdds: (n: number) => `${n} add${n !== 1 ? 's' : ''}`,
    newMembers: 'New active members',
    follow: 'Follow',
    following: 'Following',
    records: (n: number) => `${n} record${n !== 1 ? 's' : ''}`,
  },
} as const
```

- [ ] **Step 3.4: Create `src/i18n/notifications.ts`**

```typescript
export const notificationsI18n = {
  fr: {
    title: 'Notifications',
    unreadCount: (n: number) => `${n} non lu${n !== 1 ? 'es' : 'e'}`,
    empty: 'Aucune notification pour l\'instant.',
    newFollower: (name: string) => `${name} a commencé à te suivre.`,
    newShelfAddSingle: (name: string) => `${name} a ajouté un disque à sa shelf.`,
    newShelfAddMultiple: (name: string, n: number) => `${name} a ajouté ${n} disques à sa shelf.`,
    activityLike: (name: string) => `${name} a aimé ton activité.`,
    activityComment: (name: string) => `${name} a commenté ton activité.`,
    viewProfile: 'Voir profil',
    view: 'Voir',
  },
  en: {
    title: 'Notifications',
    unreadCount: (n: number) => `${n} unread`,
    empty: 'No notifications yet.',
    newFollower: (name: string) => `${name} started following you.`,
    newShelfAddSingle: (name: string) => `${name} added a record to their shelf.`,
    newShelfAddMultiple: (name: string, n: number) => `${name} added ${n} records to their shelf.`,
    activityLike: (name: string) => `${name} liked your activity.`,
    activityComment: (name: string) => `${name} commented on your activity.`,
    viewProfile: 'View profile',
    view: 'View',
  },
} as const
```

- [ ] **Step 3.5: Create `src/i18n/settings.ts`**

```typescript
export const settingsI18n = {
  fr: {
    title: 'Settings',
    profile: 'Profil',
    displayName: 'Nom d\'affichage',
    bio: 'Bio',
    avatar: 'Avatar',
    changeAvatar: 'Changer l\'avatar',
    save: 'Enregistrer',
    saved: 'Profil mis à jour ✓',
    saveError: 'Erreur lors de la mise à jour',
    privacy: 'Confidentialité',
    privateAccount: 'Compte privé',
    privateAccountHint: 'Seuls tes abonnés peuvent voir ta shelf et tes collections.',
    blockedAccounts: 'Comptes bloqués',
    manageBlocked: 'Gérer les comptes bloqués →',
    notifPush: 'Notifications — Push',
    notifEmail: 'Notifications — Email',
    notifFollower: 'Nouveau follower',
    notifShelfAdd: 'Ajout shelf (abonnés)',
    notifLike: 'Like sur mon activité',
    notifComment: 'Commentaire sur mon activité',
    language: 'Langue',
    data: 'Mes données',
    exportHint: 'Télécharge toutes tes données (shelf, collections, wants, activités, commentaires).',
    export: 'Exporter mes données',
    dangerZone: 'Zone de danger',
    deleteAccount: 'Supprimer mon compte',
    deleteConfirm: 'Supprimer ton compte ? Cette action est irréversible. Toutes tes données seront supprimées.',
    deleteError: 'Erreur lors de la suppression du compte.',
  },
  en: {
    title: 'Settings',
    profile: 'Profile',
    displayName: 'Display name',
    bio: 'Bio',
    avatar: 'Avatar',
    changeAvatar: 'Change avatar',
    save: 'Save',
    saved: 'Profile updated ✓',
    saveError: 'Error updating profile',
    privacy: 'Privacy',
    privateAccount: 'Private account',
    privateAccountHint: 'Only your followers can see your shelf and collections.',
    blockedAccounts: 'Blocked accounts',
    manageBlocked: 'Manage blocked accounts →',
    notifPush: 'Notifications — Push',
    notifEmail: 'Notifications — Email',
    notifFollower: 'New follower',
    notifShelfAdd: 'Shelf add (people you follow)',
    notifLike: 'Like on my activity',
    notifComment: 'Comment on my activity',
    language: 'Language',
    data: 'My data',
    exportHint: 'Download all your data (shelf, collections, wants, activities, comments).',
    export: 'Export my data',
    dangerZone: 'Danger zone',
    deleteAccount: 'Delete my account',
    deleteConfirm: 'Delete your account? This is irreversible. All your data will be deleted.',
    deleteError: 'Error deleting account.',
  },
} as const
```

- [ ] **Step 3.6: Create `src/i18n/onboarding.ts`**

```typescript
export const onboardingI18n = {
  fr: {
    step1Title: 'Quels formats collectionnes-tu ?',
    step1Hint: 'Tu pourras changer ça dans les settings plus tard.',
    step2Title: 'Trouve des amis',
    step2Hint: 'Suis des collectionneurs pour voir leur activité dans ton feed.',
    searchPlaceholder: 'Rechercher par username ou email…',
    step3Title: 'Ajoute ton premier disque',
    step3Hint: 'Scan le code-barres ou recherche un titre pour commencer ta collection.',
    scanSearch: 'Scanner / Rechercher',
    skip: 'Passer',
    next: 'Continuer →',
    finish: 'Passer et aller au feed',
    follow: 'Suivre',
    following: 'Abonné ✓',
    noResults: 'Aucun résultat.',
    searchError: 'Erreur de recherche.',
  },
  en: {
    step1Title: 'What formats do you collect?',
    step1Hint: 'You can change this in settings later.',
    step2Title: 'Find friends',
    step2Hint: 'Follow collectors to see their activity in your feed.',
    searchPlaceholder: 'Search by username or email…',
    step3Title: 'Add your first record',
    step3Hint: 'Scan a barcode or search for a title to start your collection.',
    scanSearch: 'Scan / Search',
    skip: 'Skip',
    next: 'Continue →',
    finish: 'Skip and go to feed',
    follow: 'Follow',
    following: 'Following ✓',
    noResults: 'No results.',
    searchError: 'Search error.',
  },
} as const
```

- [ ] **Step 3.7: Create `src/i18n/profile.ts`**

```typescript
export const profileI18n = {
  fr: {
    records: 'Disques',
    collections: 'Collections',
    followers: 'Followers',
    following: 'Following',
    wants: 'Wants',
    recentlyAdded: 'Récemment ajoutés',
    editProfile: 'Modifier le profil',
    follow: 'Suivre',
    unfollow: 'Abonné',
    moreActions: 'Plus d\'actions',
    blockUser: 'Bloquer',
    blockConfirm: (username: string) => `Bloquer @${username} ?`,
    privateAccount: 'Compte privé',
    privateHint: (name: string) => `Suis ${name} pour voir sa collection.`,
  },
  en: {
    records: 'Records',
    collections: 'Collections',
    followers: 'Followers',
    following: 'Following',
    wants: 'Wants',
    recentlyAdded: 'Recently added',
    editProfile: 'Edit profile',
    follow: 'Follow',
    unfollow: 'Following',
    moreActions: 'More actions',
    blockUser: 'Block',
    blockConfirm: (username: string) => `Block @${username}?`,
    privateAccount: 'Private account',
    privateHint: (name: string) => `Follow ${name} to see their collection.`,
  },
} as const
```

- [ ] **Step 3.8: Create `src/i18n/items.ts`**

```typescript
export const itemsI18n = {
  fr: {
    nocover: 'Pas de cover',
    ownerSection: 'Ma collection',
    condition: 'État',
    acquiredAt: 'Acquis le',
    personalNote: 'Note personnelle',
    tracklist: 'Tracklist',
    friendsHaveIt: (n: number) =>
      n === 1 ? '1 personne que tu suis a ce disque' : `${n} personnes que tu suis ont ce disque`,
    communityRating: (avg: string, count: number) =>
      `Moyenne communauté : ${avg}/5 (${count} notes)`,
    addWant: '+ Want',
    inWants: '✓ Dans mes Wants',
    edit: 'Modifier',
    delete: 'Supprimer',
    deleteConfirm: 'Supprimer ce disque de ta shelf ?',
    addToShelf: '+ Ajouter à ma shelf',
    viewInShelf: 'Voir dans ma shelf',
  },
  en: {
    nocover: 'No cover',
    ownerSection: 'My copy',
    condition: 'Condition',
    acquiredAt: 'Acquired on',
    personalNote: 'Personal note',
    tracklist: 'Tracklist',
    friendsHaveIt: (n: number) =>
      n === 1 ? '1 person you follow has this record' : `${n} people you follow have this record`,
    communityRating: (avg: string, count: number) =>
      `Community average: ${avg}/5 (${count} ratings)`,
    addWant: '+ Want',
    inWants: '✓ In my Wants',
    edit: 'Edit',
    delete: 'Delete',
    deleteConfirm: 'Remove this record from your shelf?',
    addToShelf: '+ Add to shelf',
    viewInShelf: 'View in my shelf',
  },
} as const
```

- [ ] **Step 3.9: Wire i18n into pages**

For each page that has i18n strings, read the current locale from the request (using the existing `src/i18n/` locale resolution utility) and use the corresponding key set. Follow the exact same pattern as the existing pages in the codebase.

Example pattern (adapt to your existing locale utility):
```typescript
// In page frontmatter, after session check:
import { getLocale } from '../i18n/index'
import { feedI18n } from '../i18n/feed'

const locale = getLocale(Astro.request) // 'fr' | 'en'
const t = feedI18n[locale]
```

Then replace hardcoded strings with `{t.emptyNoFollows}`, `{t.loadMore}`, etc.

> Do this for each new page: `feed.astro`, `explore.astro`, `notifications.astro`, `settings.astro`, `onboarding.astro`, `u/[username].astro`, `items/[id].astro`.

- [ ] **Step 3.10: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 3.11: Commit**

```bash
git add src/i18n/feed.ts src/i18n/explore.ts src/i18n/notifications.ts \
  src/i18n/settings.ts src/i18n/onboarding.ts src/i18n/profile.ts src/i18n/items.ts
git commit -m "feat(i18n): add EN+FR strings for all new pages"
```

---

## Task 4: Capacitor setup

**Files:**
- Modify: `package.json`
- Create: `capacitor.config.ts`

- [ ] **Step 4.1: Install Capacitor and plugins**

```bash
pnpm add @capacitor/core @capacitor/cli @capacitor/push-notifications @capacitor/camera
pnpm add -D @capacitor/ios @capacitor/android
```

- [ ] **Step 4.2: Create `capacitor.config.ts`**

```typescript
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.resonance.app',
  appName: 'Resonance',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // In development, point to the local dev server
    // Remove this in production builds
    url: process.env.NODE_ENV === 'development' ? 'http://localhost:4321' : undefined,
    cleartext: process.env.NODE_ENV === 'development',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      // Camera plugin uses native camera picker
    },
  },
}

export default config
```

- [ ] **Step 4.3: Add Capacitor scripts to `package.json`**

Open `package.json` and add to `"scripts"`:

```json
"cap:sync": "astro build && cap sync",
"cap:ios": "pnpm cap:sync && cap open ios",
"cap:android": "pnpm cap:sync && cap open android"
```

- [ ] **Step 4.4: Initialize Capacitor platforms**

```bash
pnpm exec cap add ios
pnpm exec cap add android
```

> This creates `ios/` and `android/` folders. They are large — add them to `.gitignore` or commit only the config files.

Add to `.gitignore` if desired (optional — some teams track the native projects):
```
# Uncomment to ignore Capacitor native builds
# ios/
# android/
```

- [ ] **Step 4.5: Commit**

```bash
git add package.json pnpm-lock.yaml capacitor.config.ts
git commit -m "feat(capacitor): add Capacitor shell configuration"
```

---

## Task 5: Push notification client

**Files:**
- Create: `src/capacitor/push.ts`

- [ ] **Step 5.1: Create the push notification registration module**

This module is imported in the Astro app's client-side initialization. It checks if Capacitor is available (i.e., running in the native shell), requests permission, and registers the token via `/api/push-tokens`.

```typescript
// src/capacitor/push.ts
// Loaded client-side only — uses dynamic import to avoid SSR issues

export async function initPushNotifications() {
  // Only run in Capacitor native context
  if (typeof window === 'undefined') return
  if (!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) return

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    const permStatus = await PushNotifications.checkPermissions()

    if (permStatus.receive === 'prompt') {
      const result = await PushNotifications.requestPermissions()
      if (result.receive !== 'granted') return
    }

    if (permStatus.receive !== 'granted') return

    await PushNotifications.register()

    PushNotifications.addListener('registration', async (token) => {
      const platform = getPlatform()
      await fetch('/api/push-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.value, platform }),
      }).catch(() => {})
    })

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err.error)
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      // Navigate based on notification data
      const data = notification.notification.data as { url?: string } | undefined
      if (data?.url) {
        window.location.href = data.url
      }
    })
  } catch (err) {
    console.error('Push notification init error:', err)
  }
}

function getPlatform(): 'ios' | 'android' | 'web' {
  const cap = (window as Window & { Capacitor?: { getPlatform?: () => string } }).Capacitor
  const p = cap?.getPlatform?.()
  if (p === 'ios') return 'ios'
  if (p === 'android') return 'android'
  return 'web'
}
```

- [ ] **Step 5.2: Initialize push in the main layout**

In `src/components/layouts/Layout.astro`, add a client-side script at the bottom that initializes push when the user is authenticated:

```astro
<script>
  // Initialize push notifications in Capacitor context
  import('../capacitor/push').then(({ initPushNotifications }) => {
    initPushNotifications()
  }).catch(() => {})
</script>
```

> This is a dynamic import — it won't fail on web (non-Capacitor) because the guard inside `initPushNotifications` returns early if not running in Capacitor.

- [ ] **Step 5.3: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 5.4: Commit**

```bash
git add src/capacitor/push.ts src/components/layouts/Layout.astro
git commit -m "feat(push): add push notification registration for Capacitor"
```

---

## Task 6: Camera client wrapper

**Files:**
- Create: `src/capacitor/camera.ts`

- [ ] **Step 6.1: Create the camera module**

This is used by the barcode scanner in the FAB flow. It tries Capacitor Camera first, falls back to the existing web-based `BarcodeScanner`.

```typescript
// src/capacitor/camera.ts
// Client-side only

export async function scanBarcode(): Promise<string | null> {
  const isNative =
    typeof window !== 'undefined' &&
    (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()

  if (isNative) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      })
      // Return the base64 data URL for use with the web barcode decoder
      return photo.dataUrl ?? null
    } catch (err) {
      // User cancelled or camera permission denied — silent fail
      return null
    }
  }

  // Fallback: web camera via existing BarcodeScanner component
  // The BarcodeScanner component handles its own initialization
  return null
}
```

- [ ] **Step 6.2: Commit**

```bash
git add src/capacitor/camera.ts
git commit -m "feat(camera): add Capacitor camera wrapper with web fallback"
```

---

## Task 7: Final smoke test

- [ ] **Step 7.1: Run the full test suite**

```bash
pnpm e2e:smoke
```

Expected: all smoke tests pass.

- [ ] **Step 7.2: Verify the full build one last time**

```bash
pnpm build
```

Expected: clean build with no TypeScript errors. Note the output bundle sizes — if any page exceeds 200KB of client JS, investigate what is being shipped to the client unnecessarily.

- [ ] **Step 7.3: Final commit**

```bash
git add .
git commit -m "chore: final build verification — all plans complete"
```

---

## Self-Review

**Spec coverage:**
- ✅ Vercel Image Optimization for covers (section 27) — Task 1
- ✅ `s-maxage=60, stale-while-revalidate=300` on public pages (section 27) — Task 2
- ✅ `no-store` on authenticated pages (section 27) — Task 2
- ✅ i18n: EN + FR for all new pages (feed, explore, notifications, settings, onboarding, profile, items) (section 17) — Task 3
- ✅ Capacitor shell configuration (section 21) — Task 4
- ✅ `@capacitor/push-notifications` — opt-in, token registration, navigation on tap (section 14, 21) — Task 5
- ✅ `@capacitor/camera` wrapper with web fallback (section 21) — Task 6
- ✅ Final smoke test pass (section 19 — accessibility baseline) — Task 7

**Not in scope (v1 — from spec section 28):**
- Scheduled push notifications (trending weekly job)
- Back-office editorial curation
- Per-item privacy granularity
- Haptics / status bar native Capacitor
- Algorithmic recommendations
- Content moderation back-office
- Weekly email digest
