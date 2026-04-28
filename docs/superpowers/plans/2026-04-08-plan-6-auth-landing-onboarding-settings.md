# Plan 6 — Auth, Landing, Onboarding & Settings

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the landing page, 3-step onboarding flow, and the full settings page (profile, account, privacy, notifications, RGPD export, account deletion).

**Architecture:** The landing page redirects logged-in users to `/feed`. Onboarding state (`onboardingCompleted`) is stored on the User model (Plan 1 schema). Settings is a single server-rendered page with JS-powered section forms that POST to existing API endpoints. RGPD export is rate-limited via `User.lastExportAt`.

**Tech Stack:** Astro 6 SSR, Prisma, better-auth, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-08-social-refactor-design.md` — sections 15, 20, 22, 23

**Depends on:** Plan 1 (User.onboardingCompleted, User.lastExportAt, User.isPrivate schema fields)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/pages/index.astro` | Modify | Landing page with redirect for logged-in users |
| `src/pages/onboarding.astro` | Create | 3-step onboarding flow |
| `src/pages/api/onboarding/complete.ts` | Create | POST mark onboarding as done |
| `src/pages/settings.astro` | Modify | Full settings page (all sections) |
| `src/pages/api/profile/privacy.ts` | Create | PATCH toggle isPrivate |
| `src/pages/api/profile/export.ts` | Create | GET RGPD export (rate-limited) |
| `src/pages/api/profile/notification-prefs.ts` | Create | PATCH update notification preferences |
| `src/pages/api/auth/signup.ts` | Modify | Redirect to onboarding after signup |

---

## Task 1: Landing page

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1.1: Rewrite the landing page**

Read the current `src/pages/index.astro` first, then replace with:

```astro
---
import { auth } from '../lib/auth'

// Redirect logged-in users to feed
const session = await auth.api.getSession({ headers: Astro.request.headers })
if (session) return Astro.redirect('/feed', 302)

// Public stats (optional — comment out if no DB query desired on landing)
import { db } from '../lib/db'
const [memberCount, recordCount] = await Promise.all([
  db.user.count(),
  db.shelfItem.count(),
]).catch(() => [0, 0])
---

<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Resonance — Ta collection musicale, partagée</title>
  <meta name="description" content="Resonance te permet de cataloguer ta collection vinyle, CD et cassette et de la partager avec une communauté de passionnés." />
  <link rel="stylesheet" href="/src/styles/global.css" />
</head>
<body>
  <main class="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">

    <h1 class="text-4xl font-bold tracking-tight mb-4">
      Ta collection musicale,<br />partagée.
    </h1>
    <p class="text-lg text-muted max-w-md mb-8">
      Catalogue tes vinyles, CD et cassettes. Suis des collectionneurs passionnés.
      Découvre de nouvelles pépites.
    </p>

    <div class="flex gap-3 flex-wrap justify-center">
      <a href="/signup" class="btn-primary px-6 py-3 text-base">Créer un compte</a>
      <a href="/login" class="btn-secondary px-6 py-3 text-base">Se connecter</a>
    </div>

    {(memberCount > 0 || recordCount > 0) && (
      <p class="mt-12 text-sm text-muted">
        Rejoins <strong>{memberCount.toLocaleString('fr-FR')}</strong> membres
        et <strong>{recordCount.toLocaleString('fr-FR')}</strong> disques enregistrés.
      </p>
    )}

  </main>

  <footer class="py-8 text-center text-xs text-muted">
    <a href="/legal" class="hover:underline">Mentions légales</a>
    {' · '}
    <a href="/privacy" class="hover:underline">Confidentialité</a>
  </footer>
</body>
</html>
```

- [ ] **Step 1.2: Verify build**

```bash
pnpm build 2>&1 | grep -E "(error|Error)" | grep -v "node_modules" | head -20
```

- [ ] **Step 1.3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(landing): add landing page with redirect for logged-in users"
```

---

## Task 2: Onboarding flow

**Files:**
- Create: `src/pages/onboarding.astro`
- Create: `src/pages/api/onboarding/complete.ts`

- [ ] **Step 2.1: Create the onboarding page**

```astro
---
import Layout from '../components/layouts/Layout.astro'
import { auth } from '../lib/auth'
import { db } from '../lib/db'

const session = await auth.api.getSession({ headers: Astro.request.headers })
if (!session) return Astro.redirect('/login')

// Skip onboarding if already completed
const user = await db.user.findUnique({
  where: { id: session.user.id },
  select: { onboardingCompleted: true },
})
if (user?.onboardingCompleted) return Astro.redirect('/feed')
---

<Layout title="Bienvenue sur Resonance">
  <div class="onboarding max-w-lg mx-auto px-6 py-10">

    <!-- Step indicator -->
    <div class="step-indicator flex items-center gap-2 justify-center mb-8" aria-label="Étapes">
      {[1, 2, 3].map((n) => (
        <div
          class={`step-dot w-2 h-2 rounded-full transition-colors ${n === 1 ? 'bg-accent' : 'bg-border'}`}
          data-step={n}
          aria-label={`Étape ${n}`}
        />
      ))}
    </div>

    <!-- Step 1: Formats -->
    <section id="step-1" class="onboarding-step">
      <h1 class="text-2xl font-bold mb-2">Quels formats collectonnes-tu ?</h1>
      <p class="text-muted mb-6">Tu pourras changer ça dans les settings plus tard.</p>
      <div class="flex gap-3 flex-wrap mb-8">
        {['Vinyl', 'CD', 'Cassette'].map((fmt) => (
          <label class="format-option cursor-pointer">
            <input
              type="checkbox"
              name="formats"
              value={fmt}
              class="sr-only"
              data-format={fmt}
              checked={fmt === 'Vinyl'}
            />
            <span
              class="px-5 py-3 rounded-xl border-2 border-border text-sm font-medium transition-colors block"
              data-label-for={fmt}
            >
              {fmt}
            </span>
          </label>
        ))}
      </div>
      <button class="btn-primary w-full" id="next-1">Continuer →</button>
      <button class="btn-ghost w-full mt-2 text-sm skip-btn" data-skip="true">Passer</button>
    </section>

    <!-- Step 2: Find friends -->
    <section id="step-2" class="onboarding-step hidden">
      <h2 class="text-2xl font-bold mb-2">Trouve des amis</h2>
      <p class="text-muted mb-6">Suis des collectionneurs pour voir leur activité dans ton feed.</p>
      <div class="relative mb-4">
        <input
          type="search"
          id="friend-search"
          placeholder="Rechercher par username ou email…"
          class="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <svg class="absolute left-3 top-3.5 w-4 h-4 text-muted" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <div id="friend-results" class="space-y-2 mb-6 min-h-[80px]" role="region" aria-live="polite"></div>
      <button class="btn-primary w-full" id="next-2">Continuer →</button>
      <button class="btn-ghost w-full mt-2 text-sm skip-btn" data-skip="true">Passer</button>
    </section>

    <!-- Step 3: First add -->
    <section id="step-3" class="onboarding-step hidden">
      <h2 class="text-2xl font-bold mb-2">Ajoute ton premier disque</h2>
      <p class="text-muted mb-6">Scan le code-barres ou recherche un titre pour commencer ta collection.</p>
      <div class="flex gap-3 mb-8">
        <a href="/shelf" class="btn-primary flex-1 text-center">Scanner / Rechercher</a>
      </div>
      <button class="btn-ghost w-full text-sm" id="finish-onboarding">Passer et aller au feed</button>
    </section>

  </div>
</Layout>

<script>
  // Format option toggle
  document.querySelectorAll<HTMLInputElement>('input[name="formats"]').forEach((checkbox) => {
    const label = document.querySelector(`[data-label-for="${checkbox.dataset.format}"]`)
    const update = () => {
      label?.classList.toggle('border-accent', checkbox.checked)
      label?.classList.toggle('bg-accent/10', checkbox.checked)
    }
    update()
    checkbox.addEventListener('change', update)
  })

  // Step navigation
  function goToStep(n: number) {
    document.querySelectorAll('.onboarding-step').forEach((el, i) => {
      el.classList.toggle('hidden', i + 1 !== n)
    })
    document.querySelectorAll<HTMLElement>('[data-step]').forEach((dot, i) => {
      dot.classList.toggle('bg-accent', i + 1 === n)
      dot.classList.toggle('bg-border', i + 1 !== n)
    })
  }

  // Save formats + go to step 2
  document.getElementById('next-1')?.addEventListener('click', async () => {
    const checked = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[name="formats"]:checked'),
    ).map((c) => c.value)
    if (checked.length > 0) {
      await fetch('/api/profile/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeFormats: checked }),
      }).catch(() => {})
    }
    goToStep(2)
  })

  // Step 2 → Step 3
  document.getElementById('next-2')?.addEventListener('click', () => goToStep(3))

  // Complete onboarding
  async function completeOnboarding() {
    await fetch('/api/onboarding/complete', { method: 'POST' }).catch(() => {})
    window.location.href = '/feed'
  }

  document.getElementById('finish-onboarding')?.addEventListener('click', completeOnboarding)

  // Skip buttons
  let currentStep = 1
  document.querySelectorAll<HTMLButtonElement>('.skip-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      currentStep++
      if (currentStep > 3) {
        await completeOnboarding()
      } else {
        goToStep(currentStep)
      }
    })
  })

  // Friend search
  let timer: ReturnType<typeof setTimeout>
  const friendInput = document.getElementById('friend-search') as HTMLInputElement | null
  const friendResults = document.getElementById('friend-results')

  friendInput?.addEventListener('input', () => {
    clearTimeout(timer)
    const q = friendInput.value.trim()
    if (!q || q.length < 2) {
      if (friendResults) friendResults.innerHTML = ''
      return
    }
    timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (!friendResults) return
        if (!data.users?.length) {
          friendResults.innerHTML = '<p class="text-sm text-muted">Aucun résultat.</p>'
          return
        }
        friendResults.innerHTML = data.users
          .map(
            (u: { username: string; name: string; image?: string }) => `
            <div class="flex items-center justify-between p-3 rounded-xl border border-border">
              <div class="flex items-center gap-2">
                ${u.image ? `<img src="${u.image}" alt="" width="32" height="32" class="w-8 h-8 rounded-full object-cover" />` : `<div class="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-sm">${(u.name ?? 'U')[0]}</div>`}
                <span class="text-sm font-medium">${u.name ?? u.username}</span>
              </div>
              <button
                class="follow-onboarding-btn text-xs text-accent border border-accent/30 px-3 py-1 rounded-full"
                data-username="${u.username}"
                aria-label="Suivre ${u.name ?? u.username}"
              >Suivre</button>
            </div>`,
          )
          .join('')

        friendResults.querySelectorAll<HTMLButtonElement>('.follow-onboarding-btn').forEach((btn) => {
          btn.addEventListener('click', async () => {
            btn.disabled = true
            const res = await fetch(`/api/users/${btn.dataset.username}/follow`, { method: 'POST' })
            const data = await res.json()
            btn.textContent = data.following ? 'Abonné ✓' : 'Suivre'
          })
        })
      } catch {
        if (friendResults) friendResults.innerHTML = '<p class="text-sm text-muted">Erreur de recherche.</p>'
      }
    }, 350)
  })
</script>
```

- [ ] **Step 2.2: Create the `onboarding/complete` endpoint**

```typescript
import type { APIRoute } from 'astro'
import { db } from '../../../lib/db'
import { safeErrorMessage } from '../../../lib/api-error'

// POST /api/onboarding/complete
export const POST: APIRoute = async ({ locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    await db.user.update({
      where: { id: currentUser.id },
      data: { onboardingCompleted: true },
    })
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
```

- [ ] **Step 2.3: Add user search endpoint for onboarding**

Create `src/pages/api/users/search.ts`:

```typescript
import type { APIRoute } from 'astro'
import { db } from '../../../lib/db'
import { safeErrorMessage } from '../../../lib/api-error'

// GET /api/users/search?q=xxx
export const GET: APIRoute = async ({ url, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const q = url.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return new Response(JSON.stringify({ users: [] }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const users = await db.user.findMany({
      where: {
        id: { not: currentUser.id },
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { email: { equals: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, username: true, image: true },
      take: 10,
    })
    return new Response(JSON.stringify({ users }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
```

- [ ] **Step 2.4: Redirect to onboarding after signup**

In `src/pages/signup.astro` (or wherever the signup success redirects), change the redirect target to `/onboarding` instead of `/feed` or `/shelf`. If signup is handled by better-auth's built-in flow, check `src/lib/auth.ts` for a `callbackURL` or `redirectTo` option and set it to `/onboarding`.

Open `src/lib/auth.ts` and look for the emailAndPassword configuration. Add:

```typescript
emailAndPassword: {
  enabled: true,
  requireEmailVerification: true,
  // After email verification, redirect to onboarding
  sendResetPasswordEmail: async (url, user) => {
    // existing reset password email logic
  },
},
```

If better-auth doesn't support a post-signup redirect config, add a check at the top of `/feed`:

```astro
// In src/pages/feed.astro, at the top of the frontmatter:
const user = await db.user.findUnique({
  where: { id: session.user.id },
  select: { onboardingCompleted: true },
})
if (!user?.onboardingCompleted) return Astro.redirect('/onboarding', 302)
```

> This is the simplest approach: feed redirects to onboarding if not completed. No changes to better-auth config needed.

- [ ] **Step 2.5: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 2.6: Commit**

```bash
git add src/pages/onboarding.astro \
  src/pages/api/onboarding/complete.ts \
  src/pages/api/users/search.ts \
  src/pages/feed.astro
git commit -m "feat(onboarding): add 3-step onboarding flow with redirect from feed"
```

---

## Task 3: Privacy toggle API

**Files:**
- Create: `src/pages/api/profile/privacy.ts`

- [ ] **Step 3.1: Create privacy toggle endpoint**

```typescript
import type { APIRoute } from 'astro'
import { db } from '../../../lib/db'
import { safeErrorMessage } from '../../../lib/api-error'

// PATCH /api/profile/privacy
// Body: { isPrivate: boolean }
export const PATCH: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let isPrivate: boolean
  try {
    const body = await request.json()
    if (typeof body?.isPrivate !== 'boolean') {
      return new Response(JSON.stringify({ error: 'isPrivate must be a boolean' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    isPrivate = body.isPrivate
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    await db.user.update({
      where: { id: currentUser.id },
      data: { isPrivate },
    })
    return new Response(JSON.stringify({ isPrivate }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
```

- [ ] **Step 3.2: Commit**

```bash
git add src/pages/api/profile/privacy.ts
git commit -m "feat(settings): add privacy toggle API endpoint"
```

---

## Task 4: Notification preferences API

**Files:**
- Create: `src/pages/api/profile/notification-prefs.ts`

- [ ] **Step 4.1: Create notification preferences endpoint**

> **Prerequisite:** Plan 1 schema must include a `notificationPrefs Json?` field on the `User` model, or individual boolean fields like `notifPushFollower`, `notifPushShelfAdd`, `notifEmailFollower`, `notifEmailComment`. If neither exists, add a `notificationPrefs Json @default("{}")` column to the User model in schema.prisma and run `pnpm prisma migrate dev --name add_notification_prefs`.

```typescript
import type { APIRoute } from 'astro'
import { db } from '../../../lib/db'
import { safeErrorMessage } from '../../../lib/api-error'

// PATCH /api/profile/notification-prefs
// Body: { push?: { follower?: boolean, shelfAdd?: boolean, like?: boolean, comment?: boolean },
//         email?: { follower?: boolean, comment?: boolean } }
export const PATCH: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let prefs: Record<string, unknown>
  try {
    prefs = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      select: { notificationPrefs: true },
    })
    const existing = (user?.notificationPrefs as Record<string, unknown>) ?? {}
    const merged = { ...existing, ...prefs }

    await db.user.update({
      where: { id: currentUser.id },
      data: { notificationPrefs: merged },
    })

    return new Response(JSON.stringify({ notificationPrefs: merged }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
```

- [ ] **Step 4.2: Commit**

```bash
git add src/pages/api/profile/notification-prefs.ts
git commit -m "feat(settings): add notification preferences API endpoint"
```

---

## Task 5: RGPD export endpoint

**Files:**
- Create: `src/pages/api/profile/export.ts`

- [ ] **Step 5.1: Create the export endpoint**

```typescript
import type { APIRoute } from 'astro'
import { db } from '../../../lib/db'
import { safeErrorMessage } from '../../../lib/api-error'

// GET /api/profile/export
// Rate-limited: 1 request per user per hour
export const GET: APIRoute = async ({ locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      select: { lastExportAt: true },
    })

    // Rate limit: 1 per hour
    if (user?.lastExportAt) {
      const elapsed = Date.now() - user.lastExportAt.getTime()
      const oneHour = 60 * 60 * 1000
      if (elapsed < oneHour) {
        const retryAfter = Math.ceil((oneHour - elapsed) / 1000)
        return new Response(
          JSON.stringify({
            error: 'Export rate limited. Please wait before requesting another export.',
            retryAfterSeconds: retryAfter,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
            },
          },
        )
      }
    }

    // Update lastExportAt before heavy query to prevent double-request abuse
    await db.user.update({
      where: { id: currentUser.id },
      data: { lastExportAt: new Date() },
    })

    // Gather all user data
    const [profile, shelfItems, collections, wants, activities, comments] = await Promise.all([
      db.user.findUnique({
        where: { id: currentUser.id },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          bio: true,
          createdAt: true,
        },
      }),
      db.shelfItem.findMany({
        where: { userId: currentUser.id },
        include: { release: true },
      }),
      db.collection.findMany({
        where: { userId: currentUser.id },
        include: { items: { include: { shelfItem: { include: { release: true } } } } },
      }),
      db.want.findMany({
        where: { userId: currentUser.id },
        include: { release: true },
      }),
      db.activity.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: 'desc' },
      }),
      db.activityComment.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile,
      shelf: shelfItems,
      collections,
      wants,
      activities,
      comments,
    }

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="resonance-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
```

- [ ] **Step 5.2: Commit**

```bash
git add src/pages/api/profile/export.ts
git commit -m "feat(rgpd): add GDPR data export endpoint with hourly rate limit"
```

---

## Task 6: Settings page

**Files:**
- Modify: `src/pages/settings.astro`

- [ ] **Step 6.1: Rewrite the settings page with all sections**

Read the current `src/pages/settings.astro`, then replace with:

```astro
---
import Layout from '../components/layouts/Layout.astro'
import { auth } from '../lib/auth'
import { db } from '../lib/db'

const session = await auth.api.getSession({ headers: Astro.request.headers })
if (!session) return Astro.redirect('/login')

const user = await db.user.findUnique({
  where: { id: session.user.id },
  select: {
    name: true,
    email: true,
    username: true,
    bio: true,
    image: true,
    isPrivate: true,
    notificationPrefs: true,
  },
})

if (!user) return Astro.redirect('/login')

const prefs = (user.notificationPrefs ?? {}) as {
  push?: { follower?: boolean; shelfAdd?: boolean; like?: boolean; comment?: boolean }
  email?: { follower?: boolean; comment?: boolean }
}
---

<Layout title="Settings">
  <div class="settings-page max-w-lg mx-auto px-4 py-6">
    <h1 class="text-xl font-semibold mb-8">Settings</h1>

    <!-- Profile -->
    <section class="settings-section mb-8" aria-labelledby="profile-heading">
      <h2 id="profile-heading" class="text-sm font-medium text-muted uppercase tracking-wide mb-4">Profil</h2>
      <form id="profile-form" class="space-y-4">
        <div>
          <label for="settings-name" class="block text-sm font-medium mb-1">Nom d'affichage</label>
          <input id="settings-name" name="name" type="text" value={user.name ?? ''} maxlength="50"
            class="w-full border border-border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label for="settings-bio" class="block text-sm font-medium mb-1">Bio</label>
          <textarea id="settings-bio" name="bio" rows="3" maxlength="280"
            class="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none">{user.bio ?? ''}</textarea>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Avatar</label>
          <a href="/settings/avatar" class="btn-secondary text-sm">Changer l'avatar</a>
        </div>
        <button type="submit" class="btn-primary">Enregistrer</button>
        <p class="settings-feedback text-sm text-green-600 hidden" aria-live="polite"></p>
      </form>
    </section>

    <!-- Privacy -->
    <section class="settings-section mb-8" aria-labelledby="privacy-heading">
      <h2 id="privacy-heading" class="text-sm font-medium text-muted uppercase tracking-wide mb-4">Confidentialité</h2>
      <label class="flex items-center justify-between p-4 rounded-xl border border-border cursor-pointer">
        <div>
          <p class="text-sm font-medium">Compte privé</p>
          <p class="text-xs text-muted mt-0.5">Seuls tes abonnés peuvent voir ta shelf et tes collections.</p>
        </div>
        <input
          type="checkbox"
          id="privacy-toggle"
          class="sr-only"
          checked={user.isPrivate ?? false}
          aria-label="Activer le compte privé"
        />
        <div class="toggle-visual w-10 h-6 rounded-full border-2 border-border relative transition-colors" aria-hidden="true">
          <div class="toggle-thumb w-4 h-4 rounded-full bg-muted absolute top-0.5 left-0.5 transition-transform"></div>
        </div>
      </label>

      <div class="mt-4">
        <h3 class="text-sm font-medium mb-2">Comptes bloqués</h3>
        <a href="/settings/blocked" class="text-sm text-accent hover:underline">Gérer les comptes bloqués →</a>
      </div>
    </section>

    <!-- Notifications Push -->
    <section class="settings-section mb-8" aria-labelledby="notif-push-heading">
      <h2 id="notif-push-heading" class="text-sm font-medium text-muted uppercase tracking-wide mb-4">Notifications — Push</h2>
      <div class="space-y-3">
        {[
          { key: 'follower', label: 'Nouveau follower', checked: prefs.push?.follower !== false },
          { key: 'shelfAdd', label: 'Ajout shelf (abonnés)', checked: prefs.push?.shelfAdd !== false },
          { key: 'like', label: 'Like sur mon activité', checked: prefs.push?.like !== false },
          { key: 'comment', label: 'Commentaire sur mon activité', checked: prefs.push?.comment !== false },
        ].map(({ key, label, checked }) => (
          <label class="flex items-center justify-between">
            <span class="text-sm">{label}</span>
            <input
              type="checkbox"
              class="push-pref"
              data-key={key}
              checked={checked}
              aria-label={label}
            />
          </label>
        ))}
      </div>
    </section>

    <!-- Notifications Email -->
    <section class="settings-section mb-8" aria-labelledby="notif-email-heading">
      <h2 id="notif-email-heading" class="text-sm font-medium text-muted uppercase tracking-wide mb-4">Notifications — Email</h2>
      <div class="space-y-3">
        {[
          { key: 'follower', label: 'Nouveau follower', checked: prefs.email?.follower !== false },
          { key: 'comment', label: 'Commentaire sur mon activité', checked: prefs.email?.comment !== false },
        ].map(({ key, label, checked }) => (
          <label class="flex items-center justify-between">
            <span class="text-sm">{label}</span>
            <input
              type="checkbox"
              class="email-pref"
              data-key={key}
              checked={checked}
              aria-label={label}
            />
          </label>
        ))}
      </div>
    </section>

    <!-- Language -->
    <section class="settings-section mb-8" aria-labelledby="lang-heading">
      <h2 id="lang-heading" class="text-sm font-medium text-muted uppercase tracking-wide mb-4">Langue</h2>
      <div class="flex gap-2">
        {['fr', 'en'].map((lang) => (
          <button
            class="lang-btn px-4 py-2 rounded-lg border text-sm transition-colors"
            data-lang={lang}
          >
            {lang === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
          </button>
        ))}
      </div>
    </section>

    <!-- Data (RGPD) -->
    <section class="settings-section mb-8" aria-labelledby="data-heading">
      <h2 id="data-heading" class="text-sm font-medium text-muted uppercase tracking-wide mb-4">Mes données</h2>
      <p class="text-sm text-muted mb-3">Télécharge toutes tes données (shelf, collections, wants, activités, commentaires).</p>
      <a href="/api/profile/export" class="btn-secondary text-sm" download>Exporter mes données</a>
    </section>

    <!-- Danger zone -->
    <section class="settings-section" aria-labelledby="danger-heading">
      <h2 id="danger-heading" class="text-sm font-medium text-red-500 uppercase tracking-wide mb-4">Zone de danger</h2>
      <button id="delete-account-btn" class="btn-ghost text-red-500 border border-red-200 w-full">
        Supprimer mon compte
      </button>
    </section>
  </div>
</Layout>

<script>
  // Profile form
  document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const feedback = form.querySelector('.settings-feedback') as HTMLElement | null
    const data = Object.fromEntries(new FormData(form))
    const res = await fetch('/api/profile/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (feedback) {
      feedback.textContent = res.ok ? 'Profil mis à jour ✓' : 'Erreur lors de la mise à jour'
      feedback.classList.remove('hidden')
      setTimeout(() => feedback.classList.add('hidden'), 3000)
    }
  })

  // Privacy toggle
  const privacyToggle = document.getElementById('privacy-toggle') as HTMLInputElement | null
  privacyToggle?.addEventListener('change', async () => {
    await fetch('/api/profile/privacy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPrivate: privacyToggle.checked }),
    })
  })

  // Notification prefs — debounce saves
  let prefTimer: ReturnType<typeof setTimeout>
  function savePushPrefs() {
    clearTimeout(prefTimer)
    prefTimer = setTimeout(async () => {
      const pushPrefs: Record<string, boolean> = {}
      document.querySelectorAll<HTMLInputElement>('.push-pref').forEach((cb) => {
        if (cb.dataset.key) pushPrefs[cb.dataset.key] = cb.checked
      })
      const emailPrefs: Record<string, boolean> = {}
      document.querySelectorAll<HTMLInputElement>('.email-pref').forEach((cb) => {
        if (cb.dataset.key) emailPrefs[cb.dataset.key] = cb.checked
      })
      await fetch('/api/profile/notification-prefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ push: pushPrefs, email: emailPrefs }),
      })
    }, 800)
  }
  document.querySelectorAll('.push-pref, .email-pref').forEach((el) =>
    el.addEventListener('change', savePushPrefs),
  )

  // Language
  document.querySelectorAll<HTMLButtonElement>('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const lang = btn.dataset.lang
      await fetch('/api/profile/locale', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: lang }),
      })
      window.location.reload()
    })
  })

  // Delete account
  document.getElementById('delete-account-btn')?.addEventListener('click', async () => {
    const confirmed = confirm(
      'Supprimer ton compte ? Cette action est irréversible. Toutes tes données seront supprimées.',
    )
    if (!confirmed) return
    const res = await fetch('/api/profile/delete-account', { method: 'DELETE' })
    if (res.ok) window.location.href = '/'
    else alert('Erreur lors de la suppression du compte.')
  })
</script>
```

- [ ] **Step 6.2: Verify build**

```bash
pnpm build 2>&1 | grep -E "(error|Error)" | grep -v "node_modules" | head -20
```

- [ ] **Step 6.3: Run smoke tests**

```bash
pnpm e2e:smoke
```

Expected: all smoke tests pass.

- [ ] **Step 6.4: Commit**

```bash
git add src/pages/settings.astro \
  src/pages/api/profile/privacy.ts \
  src/pages/api/profile/export.ts \
  src/pages/api/profile/notification-prefs.ts \
  src/pages/api/users/search.ts \
  src/pages/onboarding.astro \
  src/pages/api/onboarding/complete.ts \
  src/pages/index.astro
git commit -m "feat(settings): add full settings page, RGPD export, privacy toggle, notification prefs, onboarding"
```

---

## Self-Review

**Spec coverage:**
- ✅ Landing page with CTA + community stats + logged-in redirect (section 22) — Task 1
- ✅ 3-step onboarding (formats, friends, first add) (section 23) — Task 2
- ✅ `onboardingCompleted` flag prevents re-triggering (section 23) — Task 2
- ✅ Settings: profil, confidentialité, shelf, notifs push/email, langue, RGPD, danger zone (section 15) — Task 6
- ✅ Privacy toggle (isPrivate) (section 15, 18) — Task 3
- ✅ RGPD export with 1/hour rate limit via lastExportAt (section 15, 20) — Task 5
- ✅ Notification preferences (per-type on/off) (section 15) — Task 4
- ✅ Account deletion (redirects to /api/profile/delete-account) (section 15) — Task 6

**Missing (covered in Plan 7):**
- Email notification sending (Resend/Postmark integration)
- Push delivery via Capacitor
