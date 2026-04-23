# Audit UX/UI + Accessibilité — Resonance
**Date :** 2026-04-21  
**Standard :** WCAG 2.2 AA  
**Auditeur :** Claude Sonnet 4.6 (analyse statique complète du code source)  
**Branch :** staging

---

## 1. Résumé exécutif

| Catégorie | Score | Verdict |
|-----------|-------|---------|
| A — Espacement & Touch targets | 72/100 | Passable |
| B — États interactifs (focus, hover, loading, error) | 63/100 | Insuffisant |
| C — Accessibilité WCAG 2.2 AA | 61/100 | Insuffisant |
| D — Typographie | 74/100 | Passable |
| E — Couleurs & Contraste | 70/100 | Passable |
| F — Patterns Astro & code client | 75/100 | Passable |
| G — Navigation & Flux UX | 65/100 | Insuffisant |
| H — Cohérence design system | 74/100 | Passable |
| **GLOBAL** | **69/100** | **À améliorer** |

### Points forts

- Skip-nav présent et fonctionnel (`Layout.astro:109`)
- `prefers-reduced-motion` géré globalement (`global.css:271`) avec `animation: none` et `transition-duration: 0.01ms`
- `ConfirmDialog` : focus trap, Escape, restauration du focus — implémentation correcte (`ConfirmDialog.client.ts:92-119`)
- `ProfileTabs` : navigation clavier ArrowLeft/ArrowRight/Home/End correctement implémentée (`ProfileTabs.client.ts:80-115`)
- `lang` dynamique sur `<html>` depuis les préférences utilisateur
- `aria-live="polite"` sur le toast container, `aria-live="assertive"` sur `ErrorMessage`
- Focus ring Tailwind `focus-visible:ring-2` présent sur la majorité des composants interactifs
- Scrim text sur les covers (`global.css:265`) — bon réflexe

### Points faibles majeurs

- **`onchange="window.location.href = ..."`** sur 4 `<select>` dans `SortFilter.astro` : viole WCAG SC 3.2.2 (navigation déclenchée à la sélection au clavier)
- **SSR tab state** : tous les onglets de `ProfileTabs.astro` sont rendus `aria-selected="false"` côté serveur, aucun n'est `tabindex="0"` — flicker + inaccessible sans JS
- **Focus rings `/20` opacity** sur les selects (`SortFilter.astro`) : contraste probablement < 3:1 (WCAG SC 1.4.11)
- **10px labels** dans BottomBar : non lisible à distance normale, en dessous du seuil pratique de 12px
- **Icônes de badge sans `aria-hidden`** : `<Music>`, `<Calendar>`, `<Folder>`, `<Heart>` dans SortFilter (lines 139–155)

---

## 2. Top 10 priorités

### P1 — `SortFilter.astro:183,203,225,249` — Navigation sur `onchange` (BLOCKER · WCAG SC 3.2.2 + 2.1.1)

**Impact :** Un utilisateur clavier navigue dans une liste `<select>` avec les flèches → chaque pression de touche déclenche une navigation de page. Impossible d'utiliser le filtre au clavier.

**Fix :** Remplacer l'attribut `onchange` inline par un formulaire `<form method="get">` avec un bouton Submit, ou ajouter un debounce JS côté client. L'approche la plus propre pour du SSR Astro :

```astro
<!-- Wrapper form autour des selects -->
<form method="get" id="sort-filter-form">
  <select name="sort" id="sort-select" ...>...</select>
  <!-- etc. -->
  <button type="submit" class="sr-only">Appliquer les filtres</button>
</form>
```

Puis un script client qui soumet automatiquement après un délai (`setTimeout(300ms)` post-change).

---

### P2 — `ProfileTabs.astro:38-92` — État SSR incorrect (MAJOR · WCAG SC 4.1.2)

**Impact :** Rendu serveur : tous les tabs ont `aria-selected="false"` et `tabindex="-1"`. Le JS corrige ça au montage, mais avec View Transitions Astro, le script peut ne pas se réexécuter. Résultat : aucun tab n'est focusable au clavier, les lecteurs d'écran ne savent pas quel onglet est actif.

**Fix :** En Astro SSR, utiliser `activeTab` (prop) pour rendre l'état correct côté serveur :

```astro
aria-selected={tab === activeTab ? 'true' : 'false'}
tabindex={tab === activeTab ? 0 : -1}
```

---

### P3 — `SortFilter.astro:279-291` — Toggle switch sans label accessible (MAJOR · WCAG SC 4.1.2)

**Impact :** Le `<label>` externe (`for="favorites-filter"`) est correct, mais le `role="switch"` + `aria-checked` sur un `<input type="checkbox">` est redondant et potentiellement conflictuel. Sur iOS VoiceOver, un `<input type="checkbox">` avec `role="switch"` peut être annoncé deux fois.

**Fix :** Choisir une implémentation, pas les deux. Option A : garder `<input type="checkbox">` sans `role="switch"` et `aria-checked` (le browser gère nativement). Option B : utiliser un `<button role="switch" aria-checked="...">` pur sans `<input>`.

---

### P4 — `SortFilter.astro:139,144,149,155` — Icônes de badge sans `aria-hidden` (MINOR→MAJOR · WCAG SC 1.1.1)

**Impact :** `<Music size={12} />`, `<Calendar size={12} />`, `<Folder size={12} />`, `<Heart size={12} />` dans les badges de filtre actif — pas d'`aria-hidden="true"`. Les lecteurs d'écran lisent "music" ou "heart" avant le texte du badge.

**Fix :** Ajouter `aria-hidden="true"` sur chaque icône de badge (5 lignes, ~5 minutes).

---

### P5 — `SortFilter.astro:182,202,224,248` — Focus ring insuffisant sur selects (MAJOR · WCAG SC 1.4.11)

**Impact :** `focus:ring-primary/20` = ring avec 20% d'opacité. Sur fond `--color-surface` (light: `oklch(0.95 0.01 280)`), un ring violet à 20% opacité ne passe probablement pas le seuil 3:1 de contraste non-textuel.

**Fix :** Remplacer `focus:ring-primary/20` par `focus:ring-primary/50` minimum sur ces selects, ou utiliser `focus:ring-2 focus:ring-primary focus:ring-offset-1` cohérent avec le reste de l'app.

---

### P6 — `BottomBar.astro:72` — Labels 10px en dessous du seuil lisible (MINOR · UX)

**Impact :** `text-[0.625rem]` = 10px. À 60cm de distance (usage mobile typique), 10px est en dessous du confort de lecture. Apple HIG recommande 11px minimum ; la plupart des guidelines recommandent 12px.

**Fix :** `text-[0.6875rem]` (11px) ou `text-xs` (12px). Tester sur device réel.

---

### P7 — `Layout.astro:109` — `z-100` potentiellement invalide (MINOR · Bug)

**Impact :** `z-100` n'est pas une classe Tailwind v4 standard (pas de `z-100` dans l'échelle par défaut). Le skip-link risque de passer sous des overlays ou modals.

**Fix :** Remplacer `z-100` par `z-[100]` (valeur arbitraire Tailwind) ou `z-50` si suffisant.

---

### P8 — `ConfirmDialog.astro:58-68` — Textes "Confirm action" / "Are you sure" codés en dur en anglais (MAJOR · i18n)

**Impact :** Le composant ConfirmDialog affiche des textes anglais statiques non traduisibles (`"Confirm action"`, `"Are you sure you want to continue?"`, `"Cancel"`, `"Confirm"`). Ces valeurs sont écrasées dynamiquement par JS (`window.confirmDialog(title, message, ...)`) mais servent de fallback visible pendant le chargement.

**Fix :** Passer `cancelText` et `confirmText` en props depuis le composant parent et les pré-rendre, ou accepter des props i18n dans `ConfirmDialog.astro`.

---

### P9 — `ProfileTabs.astro:198-201` — CSS fallback `display: block` + `style="display: none"` conflictuels (MINOR · Bug)

**Impact :** Le CSS indique `[data-tab-content="favorites"]:not(.active) { display: block; }` (fallback sans JS), mais le HTML inline `style="display: none;"` prend la priorité (style inline > feuille de style). Résultat : sans JS, **tous** les onglets sont cachés, même le fallback favorites.

**Fix :** Soit supprimer `style="display: none;"` du HTML (laisser le CSS gérer), soit changer la logique du CSS fallback. Le plus propre :

```astro
<!-- Premier tab : pas de style="display:none" en SSR -->
<div id="panel-favorites" ...>
<!-- Autres tabs : style="display:none" -->
<div id="panel-wishlist" ... style="display: none;">
```

---

### P10 — `global.css` — Absence de styles `focus-visible` pour les éléments natifs (MAJOR · WCAG SC 2.4.7)

**Impact :** Les `<a>`, `<button>` natifs non-Tailwind (ex: boutons dans les formulaires auth, liens inline) héritent du style de focus du navigateur qui est parfois supprimé par `outline: none` général.

**Fix :** Ajouter une règle globale de fallback :

```css
:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

`--color-focus-ring` est déjà défini dans `theme.css` — l'utiliser.

---

## 3. Tableau complet des findings

### Catégorie A — Espacement & Touch targets

| # | Fichier | Ligne | Sévérité | Description | Fix proposé |
|---|---------|-------|----------|-------------|-------------|
| A1 | `BottomBar.astro` | 72 | MINOR | Labels 10px (`text-[0.625rem]`) sous seuil 12px | `text-xs` (12px) |
| A2 | `BottomBar.astro` | 63-128 | OK | Touch targets liens principaux: `min-h-13` = 52px ✓ | — |
| A3 | `SortFilter.astro` | 162 | OK | Bouton "Clear" avec `min-h-9` = 36px — acceptable | — |
| A4 | `ProfileTabs.astro` | 38-92 | MINOR | Tabs `py-2 px-4` sur mobile = ~36px height, juste au seuil WCAG 44px recommandé | Augmenter à `py-3` ou `min-h-11` |
| A5 | `ConfirmDialog.astro` | 35-48 | OK | Boutons dialog `py-3 px-6` = ~48px ✓ | — |

### Catégorie B — États interactifs

| # | Fichier | Ligne | Sévérité | Description | Fix proposé |
|---|---------|-------|----------|-------------|-------------|
| B1 | `SortFilter.astro` | 182 | MAJOR | `focus:ring-primary/20` — ring trop transparent sur selects | `focus:ring-primary/50` |
| B2 | `SortFilter.astro` | 202,224,248 | MAJOR | Même problème sur genre, year, collection selects | Idem |
| B3 | `ProfileTabs.astro` | 41 | MAJOR | `focus-visible:ring-2 focus-visible:ring-primary/70` correct ✓ mais uniquement activé par JS | Rendre l'état actif en SSR (voir P2) |
| B4 | `ConfirmDialog.astro` | 38,44 | MINOR | Boutons cancel/confirm : pas de `focus-visible` explicite — héritent de `btn-secondary-surface` / `btn-danger` | Vérifier que ces classes incluent `focus-visible:ring-2` |
| B5 | Global | — | MAJOR | Absence d'états loading sur les actions async (ajout item, toggle favori) — spinner ou skeleton absent | Ajouter `aria-busy="true"` + indicateur visuel sur les actions asynchrones |
| B6 | `SortFilter.astro` | 289 | MINOR | `peer-focus:ring-primary/20` sur le toggle switch — même problème d'opacité insuffisante | `peer-focus:ring-primary/40` |

### Catégorie C — Accessibilité WCAG 2.2 AA

| # | Fichier | Ligne | Sévérité | SC | Description | Fix proposé |
|---|---------|-------|----------|----|-------------|-------------|
| C1 | `SortFilter.astro` | 183,203,225,249 | BLOCKER | 3.2.2 | `onchange` déclenche navigation — inutilisable clavier | Form submit ou debounce JS |
| C2 | `ProfileTabs.astro` | 38-92 | MAJOR | 4.1.2 | État SSR : tous tabs `aria-selected="false"` + `tabindex="-1"` | Rendre l'état actif côté serveur |
| C3 | `SortFilter.astro` | 139,144,149,155 | MAJOR | 1.1.1 | Icônes de badge sans `aria-hidden="true"` | `aria-hidden="true"` sur chaque icône |
| C4 | `SortFilter.astro` | 279-291 | MAJOR | 4.1.2 | `role="switch"` + `aria-checked` sur `<input type="checkbox">` — doublon sémantique | Choisir une implémentation (voir P3) |
| C5 | `Layout.astro` | 109 | MINOR | 2.4.1 | Skip link présent ✓ mais `z-100` probablement invalide | `z-[100]` |
| C6 | `ConfirmDialog.astro` | 58-68 | MAJOR | 3.1.1 | Textes "Confirm action" / "Cancel" en anglais non-i18n | Passer les labels en props |
| C7 | `BottomBar.astro` | 89-98 | MINOR | 4.1.2 | FAB `aria-haspopup="dialog"` — correct mais le dialog correspondant n'est pas implémenté (le `#add-modal` est géré ailleurs) | Vérifier que le dialog référencé existe dans le DOM |
| C8 | `ProfileTabs.astro` | 98-138 | MINOR | 4.1.2 | Panels avec `tabindex="0"` — correct ✓ | — |
| C9 | `global.css` | — | MAJOR | 2.4.7 | Pas de `focus-visible` global de fallback pour éléments natifs | Ajouter `:focus-visible { outline: 2px solid var(--color-focus-ring); }` |
| C10 | `SortFilter.astro` | 176,196,217,242 | OK | 1.3.1 | Labels `<label for="...">` correctement associés aux selects ✓ | — |
| C11 | `ProfileTabs.astro` | 33-36 | OK | 4.1.2 | `role="tablist"` avec `aria-label` ✓ | — |
| C12 | `ConfirmDialog.astro` | 15-22 | OK | 1.3.1 | `role="dialog" aria-modal aria-labelledby aria-describedby` ✓ | — |
| C13 | `Layout.astro` | 40 | OK | 3.1.1 | `lang={htmlLang}` dynamique depuis préférences ✓ | — |
| C14 | `Toast.astro` | 33 | OK | 4.1.3 | `aria-live="polite"` sur container ✓ | — |
| C15 | `ErrorMessage.astro` | 21 | OK | 4.1.3 | `role="alert" aria-live="assertive"` ✓ | — |
| C16 | `Layout.astro` | 131-141 | OK | 4.1.3 | Global audio bar avec `role="status" aria-live="polite"` ✓ | — |

### Catégorie D — Typographie

| # | Fichier | Ligne | Sévérité | Description | Fix proposé |
|---|---------|-------|----------|-------------|-------------|
| D1 | `BottomBar.astro` | 72 | MINOR | `text-[0.625rem]` = 10px, sous seuil de lisibilité | `text-xs` (12px) |
| D2 | `SortFilter.astro` | 128,129 | MINOR | `text-xs` (12px) pour les labels de section — acceptable mais à surveiller | — |
| D3 | `ProfileTabs.astro` | 49,62,76,90 | OK | `text-sm` (14px) pour les labels d'onglets ✓ | — |
| D4 | `global.css:22` | 22 | OK | Font system correctement définie: `Instrument Sans`, `Instrument Serif`, `JetBrains Mono` ✓ | — |

### Catégorie E — Couleurs & Contraste

| # | Fichier | Ligne | Sévérité | Description | Fix proposé |
|---|---------|-------|----------|-------------|-------------|
| E1 | `SortFilter.astro` | 182 | MAJOR | Ring focus `/20` sur fond surface claire — ratio < 3:1 probable (WCAG 1.4.11) | `/50` minimum |
| E2 | `theme.css` | 57 | OK | `--color-muted: oklch(0.38 0.02 280)` en light — vérifié environ 7:1 sur fond `oklch(0.98)` ✓ | — |
| E3 | `theme.css` | 96 | INFO | `--color-primary: oklch(0.65 0.25 280)` dark vs `oklch(0.12)` fond — vérifier ratio texte primaire sur fond sombre | Vérifier avec un outil WCAG |
| E4 | `SortFilter.astro` | 268-269 | OK | Icône `stroke-white` sur fond `bg-primary` quand actif — contraste ✓ | — |
| E5 | `BottomBar.astro` | 70 | OK | `text-white stroke-white` sur `bg-primary/90` pour tab actif ✓ | — |
| E6 | `SortFilter.astro` | 289 | MINOR | `peer-focus:ring-primary/20` sur switch thumb — même pb opacity | `peer-focus:ring-primary/40` |

### Catégorie F — Patterns Astro & code client

| # | Fichier | Ligne | Sévérité | Description | Fix proposé |
|---|---------|-------|----------|-------------|-------------|
| F1 | `SortFilter.astro` | 183,203,225,249,284 | MAJOR | `onchange="window.location.href = ..."` inline JS dans template | Form GET + submit ou client script avec debounce |
| F2 | `ProfileTabs.astro` | 198-201 | MINOR | Règle CSS fallback `display: block` neutralisée par `style="display:none"` inline | Supprimer le `style` inline du premier panel ou corriger la règle CSS |
| F3 | `ConfirmDialog.astro` | 38,44 | MINOR | Textes anglais codés en dur dans le HTML statique | Props i18n |
| F4 | `Toast.client.ts` | — | INFO | CLAUDE.md : `innerHTML` avec SVG inline — encore présent (selon audit précédent) | Migrer vers clonage de `<template>` pré-rendu (déjà prévu dans CLAUDE.md) |
| F5 | `ProfileTabs.client.ts` | 52 | MINOR | `slot.style.display = isActive ? 'block' : 'none'` — manipulation inline de style en JS | Utiliser exclusivement `classList.toggle('hidden', ...)` ou `hidden` attribute |

### Catégorie G — Navigation & Flux UX

| # | Fichier | Ligne | Sévérité | Description | Fix proposé |
|---|---------|-------|----------|-------------|-------------|
| G1 | `SortFilter.astro` | 183+ | BLOCKER | Sélection d'un filtre au clavier = navigation immédiate (UX brisé) | Voir C1/P1 |
| G2 | `ProfileTabs.astro` | — | MAJOR | Sur reload/View Transition, les onglets flashent en état "aucun actif" avant que JS s'initialise | Corriger l'état SSR (voir P2) |
| G3 | `BottomBar.astro` | 9-15 | MINOR | `getActiveTab()` ne gère pas `/collections/[slug]`, `/items/[id]`, `/u/[username]` sauf `/u/` — retourne `null` pour collections et items | Retourner un état neutre ou l'onglet logiquement le plus proche |
| G4 | `Layout.astro` | 122-127 | OK | `<main id="main-content" tabindex="-1">` cible du skip link ✓ | — |
| G5 | `BottomBar.astro` | 47-51 | OK | Redirection profil sans username vers `/settings?complete=username` ✓ (fix session précédente) | — |
| G6 | `SortFilter.astro` | 96-116 | OK | `buildUrl()` préserve `format` et reset la page — bon comportement ✓ | — |

### Catégorie H — Cohérence design system

| # | Fichier | Ligne | Sévérité | Description | Fix proposé |
|---|---------|-------|----------|-------------|-------------|
| H1 | `SortFilter.astro` | 182 | MAJOR | `focus:ring-primary/20` ≠ `focus-visible:ring-2 focus-visible:ring-primary/70` utilisé dans ProfileTabs — incohérent | Uniformiser sur `focus-visible:ring-2 focus-visible:ring-primary/60` |
| H2 | `SortFilter.astro` | 289 | MINOR | `peer-focus:ring-primary/20` — incohérent avec le reste | Idem |
| H3 | `ProfileTabs.astro` | 41 | OK | Focus ring `focus-visible:ring-primary/70` — légèrement différent de `focus-visible:ring-primary/60` du BottomBar | Unifier à `/60` ou `/70` dans les tokens |
| H4 | `ConfirmDialog.astro` | 38 | INFO | `btn-secondary-surface` et `btn-danger` — classes custom. Vérifier qu'elles incluent bien `focus-visible:ring-2` | Auditer `button-styles.css` |
| H5 | `BottomBar.astro` | 69,82,107,120 | OK | Pattern tab actif cohérent entre tous les onglets ✓ | — |

---

## 4. Quick wins (< 15 min chacun)

### QW-1 — Icônes de badge `aria-hidden` (5 min)
**Fichier :** `src/components/collections/SortFilter.astro`  
**Lignes :** 139, 144, 149, 155  
Ajouter `aria-hidden="true"` sur `<Music>`, `<Calendar>`, `<Folder>`, `<Heart>` dans les badges de filtres actifs.

### QW-2 — Focus ring selects (10 min)
**Fichier :** `src/components/collections/SortFilter.astro`  
**Lignes :** 182, 202, 224, 248, 289  
Remplacer `focus:ring-primary/20` par `focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1` (cohérent avec le reste de l'app).

### QW-3 — Skip link z-index (2 min)
**Fichier :** `src/components/layouts/Layout.astro`  
**Ligne :** 109  
Remplacer `z-100` par `z-[100]`.

### QW-4 — ProfileTabs état SSR (15 min)
**Fichier :** `src/components/profile/ProfileTabs.astro`  
**Lignes :** 38-92  
Utiliser la prop `activeTab` pour rendre `aria-selected="true"` et `tabindex="0"` sur l'onglet par défaut dès le SSR. Supprimer les valeurs `false`/`-1` codées en dur.

### QW-5 — `role="switch"` doublon (5 min)
**Fichier :** `src/components/collections/SortFilter.astro`  
**Ligne :** 281-284  
Supprimer `role="switch"` et `aria-checked` de l'`<input type="checkbox">` natif — le navigateur le gère seul.

### QW-6 — Labels BottomBar 10px → 12px (2 min)
**Fichier :** `src/components/ui/BottomBar.astro`  
**Ligne :** 72 (et 85, 110, 127)  
Remplacer `text-[0.625rem]` par `text-xs` (12px).

### QW-7 — `focus-visible` global de fallback (5 min)
**Fichier :** `src/styles/global.css`  
Ajouter en fin de fichier :
```css
:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

### QW-8 — CSS fallback ProfileTabs (10 min)
**Fichier :** `src/components/profile/ProfileTabs.astro`  
**Ligne :** 104  
Supprimer `style="display: none;"` du premier panel `panel-favorites` pour que le fallback CSS fonctionne sans JS.

---

## 5. Chantiers structurels

### CS-1 — Refonte `SortFilter` : navigation clavier

**Effort :** M (2-4h)  
**Impact :** Bloquant WCAG, touche tous les utilisateurs clavier + screen reader

Le comportement actuel `onchange → window.location.href` est fondamentalement incompatible avec la navigation clavier. Deux approches :

**Option A — Form GET (recommandée, SSR-first) :**
Enrouler les selects dans `<form method="get">`. Ajouter un bouton "Apply filters" visible (ou sr-only). Le form soumet via navigation standard. Côté client, un script peut soumettre automatiquement avec un debounce de 500ms pour éviter l'attente. Compatible sans JS.

**Option B — URL push JS uniquement :**
Supprimer tous les `onchange` inline. Dans un `SortFilter.client.ts`, écouter les événements `change` sur les selects et pousser l'URL après debounce. Laisser un fallback `<a href="">` ou bouton de soumission pour les utilisateurs sans JS.

### CS-2 — État SSR des composants avec onglets

**Effort :** S (1-2h)  
**Impact :** Flicker visible + inaccessible sans JS pour ProfileTabs

`ProfileTabs.astro` doit refléter l'état actif directement dans le HTML généré côté serveur. La prop `activeTab` existe déjà — l'utiliser pour les attributs `aria-selected`, `tabindex`, et la classe `.active`.

Vérifier si d'autres composants avec onglets existent dans le projet et appliquer le même pattern.

### CS-3 — Harmonisation des focus rings

**Effort :** S (1h)  
**Impact :** Cohérence design + accessibilité uniforme

Créer un token CSS unique pour le style de focus ring et l'appliquer partout :
```css
/* design-tokens.css */
--focus-ring: 0 0 0 2px var(--color-background), 0 0 0 4px var(--color-focus-ring);
```
Ou utiliser une classe Tailwind custom. Aujourd'hui on trouve `/20`, `/60`, `/70` d'opacité selon les composants — aucune n'est systématique.

### CS-4 — i18n des composants UI (`ConfirmDialog`, boutons)

**Effort :** S (2h)  
**Impact :** L'app est multilingue mais les composants UI de bas niveau ont des textes anglais codés en dur

`ConfirmDialog.astro` : textes statiques `"Confirm action"`, `"Cancel"`, `"Confirm"` en anglais. Ces fallbacks sont visibles pendant le chargement JS.

Solution : passer les textes en props avec des valeurs par défaut en anglais, puis les fournir depuis les parents via le système i18n existant.

### CS-5 — Audit et correction de `Toast.client.ts` (CLAUDE.md priority)

**Effort :** M (2-4h)  
**Impact :** Violation des standards CLAUDE.md sur le innerHTML avec SVG

Comme documenté dans CLAUDE.md, `Toast.client.ts` utilise encore `innerHTML` pour injecter les icônes. La solution est déjà conçue dans `Toast.astro` (template d'icônes pré-rendu côté serveur, `#toast-icon-tpl`). Migrer le code client pour cloner ces icônes via `cloneNode(true)` au lieu d'un `innerHTML` SVG.

---

## 6. Checklist de non-régression

Vérifier avant chaque merge sur `main` :

### Accessibilité minimale
- [ ] Skip link visible et fonctionnel au focus clavier (`Tab` depuis la page, doit apparaître)
- [ ] Tous les champs de formulaire ont un `<label>` associé (`for` ou `aria-label`)
- [ ] Tous les boutons icônes sans texte ont un `aria-label`
- [ ] Les modals/dialogs : `role="dialog" aria-modal aria-labelledby` présents
- [ ] Les toasts : `aria-live` ou `role="alert"` présent
- [ ] Navigation clavier complete sur les composants interactifs (Tab, Shift+Tab, Enter, Space, Escape pour modals)

### Icônes
- [ ] Zéro SVG inline brut (vérifier avec `grep -r '<svg' src/components --include='*.astro'`)
- [ ] Toutes les icônes Lucide : `aria-hidden="true"` si décoratives, `aria-label` si interactives
- [ ] Zéro emoji dans les fichiers `.astro` et `src/i18n/`

### JavaScript client
- [ ] Zéro `innerHTML` avec HTML non-trivial dans les fichiers `*.client.ts`
- [ ] Zéro `onchange` / `onclick` inline dans les templates `.astro`
- [ ] Les mises à jour DOM utilisent `textContent`, `classList`, `setAttribute`

### Contraste et couleurs
- [ ] Focus rings avec opacité ≥ 50% (`ring-primary/50` minimum)
- [ ] Textes sur fonds colorés : vérifier avec [contrast checker](https://webaim.org/resources/contrastchecker/) pour les nouvelles couleurs

### Responsive
- [ ] Test sur 375px (iPhone SE) : aucun overflow horizontal
- [ ] Touch targets ≥ 44px de hauteur pour les éléments interactifs mobiles

### États
- [ ] Chaque action async a un indicateur de chargement ou désactive le bouton pendant l'attente
- [ ] Les états d'erreur sont annoncés via `role="alert"` ou `aria-live`

---

*Généré par analyse statique complète du code source — branche `staging`, 2026-04-21.*  
*Prochaine révision recommandée après implémentation des quick wins (QW-1 à QW-8) et du chantier CS-1.*
