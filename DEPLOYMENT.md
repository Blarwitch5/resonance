### Guide de déploiement Vercel pour Resonance

Ce guide explique **pas à pas** comment déployer ton app Astro monorepo sur **Vercel**, avec :

- **Prod** (branche `main`)
- **Staging / Preview** (branche `staging` + PR)
- **Variables d’environnement** (DB, Discogs, Spotify, etc.)

Adapte les noms si certains diffèrent dans ton `.env`.

---

## 1. Préparation du dépôt

### 1.1. Branches Git

- **`main`**
  - Branche de **production**.
  - Optionnel : protégée (review obligatoire).

- **`staging`**
  - Branche de **staging** (ta “version pré-prod”).
  - Sert aussi de base pour tester les features avant `main`.

Workflow suggéré :

- Tu développes sur des branches `feat/...`.
- Tu merges ces branches dans **`staging`** pour tester.
- Quand tout est OK, tu merges **`staging` → `main`** pour déployer en prod.

---

## 2. Création du projet Vercel

1. Va sur `https://vercel.com`, connecte-toi (GitHub/GitLab/Bitbucket).
2. **“New Project” → “Import Git Repository”**.
3. Sélectionne ton repo `Resonance`.

### 2.1. Répertoire et framework

Ton repo ressemble à ceci (à adapter si besoin) :

- `app/` → app principale Astro
- `landing/` → éventuellement une landing Astro séparée
- `packages/` → libs partagées
- `pnpm-workspace.yaml` à la racine

Tu veux déployer **l’app principale** :

- Dans Vercel, choisis **“Monorepo → app/”** comme **Root Directory** si besoin.
- Framework détecté : **Astro** (Vercel devrait le voir automatiquement).

### 2.2. Commande de build et dossier de sortie

Dans la section “Build & Output Settings” du projet :

- **Install Command** (à la racine du repo) :

  ```bash
  pnpm install
  ```

- **Build Command** (dans le répertoire `app/`) :

  ```bash
  pnpm build
  ```

- **Output Directory** (dans `app/`) :
  - `dist`

---

## 3. Variables d’environnement

Tu as déjà un `app/.env` local. L’idée :

- **Ne jamais committer tes vrais secrets.**
- Créer un fichier `app/.env.example` (sans valeurs) pour documenter.
- Recréer **les mêmes clés** dans Vercel (Production / Preview).

### 3.1. Typologie

Exemples typiques pour Resonance (à adapter à ton `.env`) :

- **Base de données**
  - `DATABASE_URL` (ou `ASTRO_DB_URL`, etc.)
- **Discogs**
  - `DISCOGS_TOKEN`
- **Spotify**
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_CLIENT_SECRET`
  - (éventuellement `SPOTIFY_REDIRECT_URI`)
- **URL de l’app**
  - `PUBLIC_APP_URL` ou `PUBLIC_SITE_URL`

Règle :

- Tout ce qui est **secret** (tokens, secrets, URL DB) → **sans préfixe `PUBLIC_`**.
- Tout ce qui peut être lu côté client → **préfixé par `PUBLIC_`**.

Dans le code Astro / TS :

```ts
const dbUrl = import.meta.env.DATABASE_URL
const discogsToken = import.meta.env.DISCOGS_TOKEN

const appUrl = import.meta.env.PUBLIC_APP_URL
```

---

## 4. Configuration des variables dans Vercel

Dans ton projet Vercel :

- Va dans **“Settings → Environment Variables”**.
- Ajoute tes clés **une par une**.

### 4.1. Environnement Production (branche `main`)

Pour chaque variable :

1. **Name** : `DATABASE_URL`
2. **Value** : `postgres://user:password@host:port/dbname` (ou autre)
3. **Environment** : coche **Production** (et éventuellement Preview, voir plus bas)

Fais idem pour :

- `DISCOGS_TOKEN`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `PUBLIC_APP_URL` → ex. `https://resonance.app` ou un domaine custom

### 4.2. Environnement Preview (staging + PR)

Toujours dans **Environment Variables** :

- Même **Name** pour chaque variable, mais tu peux :
  - Reprendre les **mêmes valeurs** que la prod, ou
  - Utiliser des valeurs différentes (DB de test, autres tokens).

- Coche **Preview** (et éventuellement Development).

Exemple :

- `DATABASE_URL` (base de données de staging)
- `DISCOGS_TOKEN` (même token ou token sandbox)
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`
- `PUBLIC_APP_URL` → ex. `https://resonance-staging.vercel.app`

Tu peux utiliser **exactement les mêmes noms** de variables entre Production et Preview : Vercel sélectionne les valeurs en fonction de l’environnement du déploiement.

---

## 5. Gestion Prod / Staging sur Vercel

### 5.1. Définir la branche de production

Dans Vercel :

- **Settings → Git**
  - **Production Branch** : `main`

Résultat :

- Chaque déploiement issu de `main` est **Production**.
- Les autres (`staging`, PR, etc.) sont **Preview**.

### 5.2. Créer un environnement Staging stable

Branche `staging` :

- Dans Git, crée `staging` depuis `main`.
- Tu travailles comme ceci :

  1. Tu merges tes features dans `staging`.
  2. Vercel déploie automatiquement un **Preview** basé sur `staging`.
  3. Tu obtiens une URL stable de type :
     - `https://ton-projet-git-staging-toncompte.vercel.app`

Tu peux aussi :

- Dans **Project Settings → Domains**, ajouter un sous-domaine dédié (ex. `staging.tondomaine.com`) pointant sur l’environnement Preview `staging` (optionnel).

### 5.3. Preview par PR

Vercel gère automatiquement :

- À chaque **Pull Request** vers `staging` ou `main` :
  - Un déploiement Preview avec une URL dédiée.
  - Tu peux tester la feature isolément.

---

## 6. Contrôler plus finement les déploiements

Si tu ne veux **pas** que chaque push sur `staging` ou une PR déclenche un déploiement :

- Dans **Settings → Git → Deployments** :
  - Tu peux mettre certaines branches en **“Preview: Manual”**.
  - Tu déclenches alors les builds manuellement via le bouton **“Deploy”** dans Vercel.

Usage recommandé :

- Laisser l’automatique pour `staging` (pratique pour voir en continu).
- Mettre **manuelle** sur certaines branches expérimentales si tu veux garder le contrôle.

---

## 7. Fichiers `.env` côté code

### 7.1. Local

Dans `app/` :

- `app/.env.example` :

```bash
# Base de données
DATABASE_URL=

# Discogs
DISCOGS_TOKEN=

# Spotify
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=

# URL publique de l'app
PUBLIC_APP_URL=
```

- `app/.env.local` (dans `.gitignore`) :

```bash
DATABASE_URL=postgres://...
DISCOGS_TOKEN=xxx
SPOTIFY_CLIENT_ID=xxx
SPOTIFY_CLIENT_SECRET=xxx
PUBLIC_APP_URL=http://localhost:4321
```

Astro va lire `.env`, `.env.local` automatiquement.

### 7.2. Important : jamais de secrets en clair dans le repo

- `.env.local` **ne doit pas** être commité.
- Seul `.env.example` (sans valeurs) se trouve dans Git.

---

## 8. Check final avant premier déploiement

1. **Code**
   - Toutes les variables viennent bien de `import.meta.env.*` (et non `process.env` partout dans l’app Astro).
   - Pas de secret utilisé côté client sans préfixe `PUBLIC_`.

2. **Vercel Settings**
   - Root directory : `app`.
   - Build command : `pnpm build`.
   - Output : `dist`.
   - Production branch : `main`.
   - Variables d’environnement remplies pour Production et Preview.

3. **Git**
   - `staging` créé depuis `main`.
   - Tu pushes `staging` → Vercel déploie un Preview.
   - Tu merges `staging` → `main` quand tu veux passer en prod.

---

Tu peux adapter ce fichier au fur et à mesure (ajout de nouvelles variables, procédures de rollback, etc.) pour qu’il reste la référence de déploiement de Resonance.

