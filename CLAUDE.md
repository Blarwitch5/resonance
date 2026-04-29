
## Utilisation des modèles IA

### Stratégie de modèles pour optimiser les tokens

- **Opus 4.6** (`claude-opus-4-6`) pour la réflexion, la planification et le brainstorming :
  - Création de plans d'action et d'architecture
  - Brainstorming de fonctionnalités ou d'approches techniques
  - Analyse de problèmes complexes, arbitrages techniques
  - Toute tâche qui nécessite du raisonnement approfondi avant d'écrire du code

- **Sonnet 4.6** (`claude-sonnet-4-6`) pour l'exécution des tâches générées par Opus :
  - Implémentation du code une fois le plan validé
  - Corrections de bugs identifiés
  - Modifications ciblées sur des fichiers connus
  - Tâches répétitives ou bien définies

L'objectif est d'utiliser Opus là où la qualité de réflexion compte, et Sonnet pour l'exécution efficace.

---

## Règles de design et développement

### Stack et philosophie

- Projet **Astro SSR sans framework JS** (pas de React, Vue ou Svelte). Toute l'UI est en `.astro`.
- **HTML d'abord.** Le JavaScript côté client est une exception, pas la règle. Un `<script>` dans un composant `.astro` ne doit servir qu'à gérer de l'interactivité impossible sans JS (toggle, debounce, fetch dynamique). Jamais pour rendre du markup.
- **Tailwind CSS v4** via `@tailwindcss/vite`. Les tokens de design sont dans `src/styles/theme.css` (`@theme`), `src/styles/design-tokens.css` et `src/styles/global.css`.

### Icônes — règles strictes

- **Zéro emoji** dans l'interface, les composants `.astro`, les messages affichés à l'utilisateur, et les fichiers de traduction (`src/i18n/`). Aucune exception.
- **Utiliser exclusivement `@lucide/astro`** (déjà installé) pour toute icône ou symbole visuel.
- Import par icône individuelle, jamais l'import du package entier :
  ```astro
  ---
  import CircleCheck from '@lucide/astro/icons/circle-check'
  ---
  <CircleCheck size={16} class="text-success" aria-hidden="true" />
  ```
- **Ne jamais coller de SVG inline brut** dans un template. Si un SVG custom est indispensable (logo, illustration), il doit être encapsulé dans un composant `.astro` dédié dans `src/components/ui/`.
- Toujours ajouter `aria-hidden="true"` sur les icônes décoratives, et `aria-label` sur les icônes interactives sans texte adjacent.

### Composants — règles strictes

- **Aucun markup dupliqué.** Si un pattern HTML apparaît plus d'une fois (ou est prévu pour), il est extrait dans un composant `.astro`.
- Structure des `Props` : `interface Props` explicite en haut du frontmatter, avec types et valeurs par défaut via destructuration.
- Utiliser `<slot />` et les slots nommés pour la flexibilité plutôt que des props `html` ou `content`.
- Organisation :
  - `src/components/ui/` → primitives réutilisables (Button, Card, Badge, Input, Icon, Avatar, Toast…)
  - `src/components/layouts/` → structurels (Layout, Header, Footer, BottomBar…)
  - `src/components/` → composants métier (ItemCard, ProfileHeader, TrackList…)

### JavaScript client — règles strictes

- Les fichiers `*.client.ts` ne doivent **jamais générer de markup HTML** (`innerHTML`, `createElement`, `insertAdjacentHTML` avec du HTML non trivial). Toute structure HTML doit être rendue côté serveur dans le `.astro` et simplement affichée/masquée/mise à jour en JS.
- Si un composant nécessite des états dynamiques multiples (ex. toast, modal), la structure HTML de base doit être pré-rendue dans le `.astro`, et le JS ne fait que modifier des classes, des attributs ou du texte.
- Pas de template literals HTML dans les scripts client. Utiliser `textContent`, `classList`, `setAttribute` pour les mises à jour.
- Pour le chargement dynamique (ex. pagination "load more"), pré-rendre un élément `<template>` côté serveur avec la structure complète, puis le cloner et le remplir en JS via `cloneNode(true)` + `querySelector` + `textContent`/`setAttribute`.

### Nommage des variables — règles strictes

- **Zéro variable à lettre unique** (`r`, `u`, `t`, `e`, `i`, `n`…). Aucune exception, y compris dans les boucles `for`, les callbacks et les paramètres de fonctions.
- Noms descriptifs et non ambigus : préférer `activity` à `item`, `seedUser` à `user` dans un contexte de seeding, `releaseData` quand la variable porte les données brutes avant upsert, etc.
- Les paramètres de fonctions courts comme `(error)` ou `(event)` sont acceptables — mais pas `(e)` ou `(err)` quand un nom complet est possible.

### Composants — réutilisation

- **Toujours utiliser les composants existants** avant d'écrire du HTML inline. En particulier :
  - Avatars utilisateur → `<Avatar>` (`src/components/ui/Avatar.astro`)
  - Images avec fallback → `<OptimizedImage>` (`src/components/ui/OptimizedImage.astro`)
  - Icônes → `@lucide/astro` (jamais de SVG inline ou d'emoji)
- Si un pattern HTML identique (ou quasi-identique) apparaît dans plus d'un endroit, l'extraire dans un composant `.astro` immédiatement, pas "plus tard".

### Plan de refactoring — violations identifiées

Les éléments suivants enfreignent ces règles et doivent être corrigés lors des prochaines modifications de ces fichiers :

| Fichier | Violation | Correction prévue |
|---|---|---|
| `src/components/ui/Toast.client.ts` | `innerHTML` avec SVG inline pour les icônes de toast | Pré-rendre les icônes dans `Toast.astro` via `@lucide/astro`, JS ne fait que `show/hide` |
| `src/components/explorer/SearchBar.client.ts` | `innerHTML` pour injecter les résultats de recherche | Extraire un composant `SearchResult.astro`, pré-rendre un template `<template>` côté serveur |
| `src/pages/ExplorerPage.client.ts` | `innerHTML` (1 occurrence) | Identifier et migrer vers manipulation d'attributs |
| `src/components/ui/BarcodeScanner.astro` | SVG inline brut (barcode icon) | Remplacer par `<ScanBarcode>` de `@lucide/astro` |
| `src/components/auth/OAuthButtons.astro` | SVG inline (logos Google/GitHub) | Acceptable pour les logos tiers (pas dans Lucide) — encapsuler dans `src/components/ui/GoogleLogo.astro` et `GithubLogo.astro` |
| `src/components/profile/ProfileHeader.astro` | SVG inline | Remplacer par icône Lucide équivalente |
| `src/pages/onboarding.astro`, `settings.astro` | SVG inline ponctuel | Remplacer au fil des modifications |

Ces corrections sont à appliquer **lors de la prochaine modification de chaque fichier concerné**, pas en bloc (pour éviter des PRs de refactoring massives sans valeur produit).

---

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
