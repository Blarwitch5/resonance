# Plan de refactor `Astro + Client TS`

## Décision d'architecture

Le pattern cible est:

- `*.astro`: markup + données de configuration uniquement.
- `*.client.ts`: logique interactive, typage strict, gestion d'événements, effets UI.
- Communication `astro -> client`: `data-*` et/ou `<script type="application/json">`.

Ce pattern est retenu car il:

- évite les fuites de syntaxe TypeScript dans le HTML final;
- stabilise le comportement avec Astro View Transitions;
- rend la logique testable et réutilisable;
- uniformise les conventions sur toute l'application.

## Exceptions contrôlées

Certains scripts inline restent autorisés uniquement pour du **pré-paint critique**:

- thème avant paint (éviter le flash clair/sombre);
- micro-bootstrap global qui doit s'exécuter avant toute hydratation.

Règle: toute logique métier/UI interactive doit rester dans `*.client.ts`.

## Stratégie de migration

1. Migrer les composants sensibles (modales, toasts, menus, onglets, auth).
2. Migrer les composants à `define:vars` / `is:inline` restants.
3. Vérifier `pnpm build` + lints après chaque lot.
4. Éliminer les handlers dupliqués via garde `data-initialized` + `astro:page-load`.

## État d'avancement

### Déjà migré vers `*.client.ts`

- `src/components/ui/Toast.astro` -> `src/components/ui/Toast.client.ts`
- `src/components/ui/ConfirmDialog.astro` -> `src/components/ui/ConfirmDialog.client.ts`
- `src/components/ui/BarcodeScanner.astro` -> `src/components/ui/BarcodeScanner.client.ts`
- `src/components/ui/LanguageSwitcher.astro` -> `src/components/ui/LanguageSwitcher.client.ts`
- `src/components/auth/OAuthButtons.astro` -> `src/components/auth/OAuthButtons.client.ts`
- `src/components/profile/ProfileTabs.astro` -> `src/components/profile/ProfileTabs.client.ts`
- `src/components/items/CollectionSelector.astro` -> `src/components/items/CollectionSelector.client.ts`
- `src/components/items/ItemActionsMenu.astro` -> `src/components/items/ItemActionsMenu.client.ts`
- `src/components/items/DeleteItemModal.astro` -> `src/components/items/DeleteItemModal.client.ts`

### Restant à migrer (prochain lot)

- `src/components/items/AddToCollectionButton.astro`
- `src/components/items/TrackList.astro`
- `src/components/items/PersonalDataSection.astro`
- `src/components/collections/CollectionHeader.astro`
- `src/components/collections/CollectionSearch.astro`
- `src/components/explorer/AddToCollectionModal.astro`
- `src/components/items/ItemActions.astro`
- `src/components/profile/ImportExport.astro`
- `src/components/profile/WishlistGrid.astro`
- `src/components/ui/ThemeSwitcher.astro`
- `src/components/ui/KeyboardShortcuts.astro`
- `src/components/layouts/Layout.astro` (hors bootstrap thème pré-paint)
