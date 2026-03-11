# Audit UX / UI & Accessibilité — Resonance

**Date:** 2025-02  
**Périmètre:** Interface complète (design system, composants, pages), WCAG 2.1 AA, bonnes pratiques web design.

---

## 1. Design system & structure

### 1.1 Points positifs
- **Thème** : Variables OKLCH (light/dark) cohérentes, tokens d’espacement (4px base), rayons, ombres, transitions.
- **Focus** : `design-tokens.css` définit `--focus-ring-width`, `--focus-ring-offset`, `--focus-ring-color` ; `button:focus-visible` et inputs ont un outline.
- **Hiérarchie** : Typo via Tailwind, titres H1/H2/H3 présents sur les pages principales.
- **Layout** : `<main>` utilisé dans `Layout.astro`, zone de contenu claire.

### 1.2 Corrigé / à surveiller
- **Variables manquantes** : ✅ Définies dans `theme.css` (focus-ring, text-on-primary, primary-hover).
- **Reduced motion** : ✅ Généralisé dans `global.css` avec `@media (prefers-reduced-motion: reduce)`.
- **Touch targets** : ✅ BottomBar avec `min-h-[44px]` et `py-3` sur les liens (WCAG 2.5.5).

---

## 2. Accessibilité (WCAG 2.1 AA)

### 2.1 Navigation & repères
- **Skip link** : ✅ Lien « Skip to main content » dans Layout, masqué par défaut (`-translate-y-[9999px]`), visible uniquement au focus ; cible `<main id="main-content">`.
- **Landmarks** (vérification détaillée section 6.4) : `<main id="main-content">` (contenu principal) ; Header / AppHeader avec `role="banner"` ; Footer avec `role="contentinfo"` ; Sidebar en `<aside role="complementary" aria-label="Site navigation">` ; BottomBar en `<nav aria-label="Main navigation">` ; Footer nav `aria-label="Footer navigation"`. Un seul H1 par page (vérifié ; reset-password affiche un seul H1 selon le cas). La page d’accueil possède `Resonance` en H1 et tous les autres titres ont été alignés en H2 ; les pages `/login` et `/explorer` ont désormais un H1 explicite. ✅

### 2.2 Focus & clavier
- **Focus visible** : Présent sur boutons/liens/inputs dans `design-tokens.css` et `theme.css`. S’assurer que **tous** les contrôles personnalisés (ThemeSwitcher, ItemCard actions) ont un `:focus-visible` visible (pas seulement `:focus`).
- **Piège de focus** : ConfirmDialog gère Tab/Escape et restauration du focus → bon.
- **Ordre de tabulation** : Cohérent (sidebar, contenu, bottom bar). Pas de `tabindex` positif repéré.

### 2.3 Formulaires & erreurs
- Labels associés (`for`/`id`), `aria-invalid` et messages d’erreur inline sur login, signup, forgot-password, reset-password, collections/new.
- Blocs d’erreur avec `role="alert"` ou `aria-live="polite"` → bon.

### 2.4 Contraste & couleurs
- **text-muted** : `--color-muted` ajusté (light: 0.38, dark: 0.72) pour viser ~4.5:1 sur le fond ; opacité 1 dans design-tokens.
- Liens : couleur primary ; underline au hover pour liens dans le contenu (sauf nav/cards) → bon.

### 2.5 Contenu dynamique & ARIA
- **Toast** : ✅ `aria-live="polite"`, rôle `status`/`alert` ; bouton fermer `aria-label="Close"`.
- **ConfirmDialog** : ✅ Titre/boutons en anglais (Confirm action, Cancel, Confirm).
- **Modales** : ✅ AddToCollectionModal et DeleteItemModal : focus trap (Tab + Escape), restauration du focus, `aria-labelledby`/`aria-describedby`. DeleteItemModal et AddToCollectionModal : textes et aria-labels passés en EN. BarcodeScanner : déjà EN, `aria-label="Close"` / « Close scanner ».

### 2.6 Contenu visible au hover uniquement
- **ItemCard** : ✅ Actions visibles au `group-focus-within` et `focus-within` (clavier/touch).

---

## 3. Bonnes pratiques UI / UX

### 3.1 Cohérence
- Boutons primaires (gradient), secondaires (surface), danger (rouge) ; libellés en anglais après audit i18n.
- Espacements réguliers (cards, sections), bordures et rayons homogènes.

### 3.2 Feedback
- États disabled sur boutons (opacité, cursor). Chargement (ex. « Creating… », « Signing in… ») présent sur formulaires.
- Toasts pour succès/erreur ; messages d’erreur inline sur les champs.

### 3.3 Responsive & tactile
- BottomBar masquée sur desktop (`md:hidden`), Sidebar adaptée (toggle tablette, fixe desktop).
- Viewport et touch (viewport meta, apple-mobile-web-app-*). Cible minimale 44px à garantir sur les contrôles mobiles (bottom bar, boutons dans les cards).

### 3.4 Performance perçue
- Images avec OptimizedImage, lazy loading ; transitions Astro. Pas de surcharge d’animations si `prefers-reduced-motion: reduce`.

---

## 4. Actions prioritaires (implémentées ou à faire)

| Priorité | Action | Statut |
|----------|--------|--------|
| P0 | Définir `--color-focus-ring`, `--color-text-on-primary`, `--color-primary-hover` dans theme | ✅ Fait |
| P0 | Ajouter un lien « Skip to main content » dans Layout | ✅ Fait |
| P0 | ConfirmDialog : texte EN (Confirm action, Cancel, Confirm) | ✅ Fait |
| P0 | Layout : aria-label menu « Open menu » / « Close menu » (EN) | ✅ Fait |
| P0 | Toast : aria-label bouton « Close » (EN) | ✅ Fait |
| P0 | Barre audio globale : aria-label « Now playing » (EN) | ✅ Fait |
| P0 | BottomBar : aria-label « Main navigation » (EN) | ✅ Fait |
| P1 | ItemCard : afficher actions au focus-within (clavier/touch) | ✅ Fait |
| P1 | ThemeSwitcher : utiliser focus-visible (pas seulement focus) | ✅ Fait |
| P1 | Réduire animations si `prefers-reduced-motion: reduce` (global.css) | ✅ Fait |
| P2 | Contraste text-muted / background (theme.css + design-tokens) | ✅ Fait |
| P2 | Touch targets BottomBar ≥ 44px (min-h-[44px], py-3) | ✅ Fait |
| P3 | Modales DeleteItemModal + AddToCollectionModal : i18n EN, aria-label Close | ✅ Fait |
| P3 | PersonalDataSection / ItemDetail : libellés et options condition en EN | ✅ Fait |
| P3 | ActivityTimeline : alt image cover, textes relatifs EN, libellé « Added to favorites » | ✅ Fait |
| P4 | TrackList : bouton fermer + icônes sans createElementNS (SVG string ou Astro) | ✅ Fait |
| P3 | Troisième passe : aria-labels et libellés FR → EN (ItemActionsMenu, Footer, Sidebar, ProfileTabs, CollectionFilter, sections Details) | ✅ Fait |
| P3 | Landmarks : role="banner" (Header/AppHeader), role="contentinfo" (Footer), role="complementary" + aria-label (Sidebar), vérification main unique | ✅ Fait |

---

## 5. Résumé

- **Design system** : ✅ Variables theme, reduced-motion, touch targets BottomBar, contraste text-muted.
- **Accessibilité** : ✅ Skip link, ARIA/EN sur Toast/ConfirmDialog/modales, focus-visible (ThemeSwitcher), focus-within (ItemCard), focus trap sur dialogs.
- **UX** : Cohérent et lisible ; cibles tactiles et contraste renforcés.

## 6. Suite de l’audit (vérifications effectuées)

- **Modales** : DeleteItemModal et AddToCollectionModal — i18n (titres, boutons, messages d’erreur, aria-label fermeture) et vérification focus trap + Escape.
- **Hiérarchie titres** : Une seule H1 par page (pages conditionnelles OK). La page d’accueil a été corrigée pour éviter un H3 sans H2 précédent (`My Library` → H2, ainsi que les autres sections de la page), et les pages `/login` et `/explorer` exposent désormais un H1 accessible.
- **Formulaires** : role="alert" et aria-live sur les blocs d’erreur (login, signup, forgot-password, reset-password, collections/new, settings) ; aria-invalid géré côté client où pertinent. ✅
- **Document** : `<html lang="en">` présent dans Layout.astro. ✅

### 6.1 Deuxième passe (accessibilité + i18n cohérente)

| Élément | Correction |
|--------|------------|
| PersonalDataSection | Libellés formulaire et mode lecture en EN (Personal notes, Purchase date, Purchase price, Purchase location, My rating, Condition) ; CONDITION_LABELS (Mint, Near mint, etc.) ; placeholder EN. |
| ItemDetail | « Notes personnelles » → « Personal notes ». |
| ActivityTimeline | alt descriptif sur l’image cover (Cover: {title} by {artist}) ; textes relatifs en EN (« X min ago », « Xd ago », locale en-GB) ; « Mis en favori » → « Added to favorites ». |
| ThemeSwitcher | Déjà conforme : aria-label="Change theme", focus-visible. ✅ |

### 6.2 À surveiller (recommandations)

- **TrackList** : ✅ Bouton fermer et icônes : SVG en string (innerHTML limité à l’icône) ou composants Astro, pas de création SVG en JS.
- **Images décoratives** : ActivityTimeline a un alt descriptif. Vérifier à l’avenir que toute image informative a un alt pertinent.

### 6.3 Troisième passe (audit continu)

| Élément | Correction |
|--------|------------|
| ItemActionsMenu | aria-label « Plus d'actions » → « More actions » ; libellé « Retirer de la collection » → « Remove from collection » ; confirm dialog EN. |
| items/[id], explorer/[slug] | Titre de section H2 « Informations » → « Details ». |
| Footer | aria-label « Navigation du footer » → « Footer navigation ». |
| Sidebar | aria-label « Navigation principale » → « Site navigation » (aside complementary). |
| ProfileTabs | aria-label « Sections du profil » → « Profile sections ». |
| CollectionFilter | aria-label « Filtrer par collection » → « Filter by collection ». |
| SearchResultsGrid | Titre « X résultats » → « X results ». |
| Liens externes | Aucun `target="_blank"` repéré ; pas de mention « s’ouvre dans une nouvelle fenêtre » à ajouter. |
| Hiérarchie titres | reset-password : un seul H1 affiché selon le cas (token valide ou non). ✅ |

### 6.4 Vérification des landmarks

- **Layout.astro** : Un seul `<main id="main-content">` ; skip link cible `#main-content`. Pas de `role` sur main (implicite en HTML5). ✅
- **Pages avec Layout seul** (login, signup, forgot-password, reset-password) : Contenu dans le slot = à l’intérieur de `<main>`. Pas de header ni sidebar ; un seul repère principal. ✅
- **Pages avec DashboardLayout** : Slot rendu dans `<main>` ; à l’intérieur du slot : Sidebar (aside) + zone de contenu. Donc structure : `main` > (aside + contenu). Un seul `main` par page. ✅
- **Banner** : `Header.astro` et `AppHeader.astro` utilisés comme en-tête de page → `role="banner"` ajouté (un seul affiché à la fois). ✅
- **Contentinfo** : `Footer.astro` → `role="contentinfo"` ajouté. ✅
- **Navigation / complémentaire** : Sidebar = `<aside role="complementary" aria-label="Site navigation">` ; BottomBar = `<nav aria-label="Main navigation">` ; Footer = `<nav aria-label="Footer navigation">`. Pas de doublon de libellé. ✅
- **Région live** : Barre audio globale = `<div aria-live="polite" aria-label="Now playing">` (pas un landmark). ✅
- **Footer** : Lien « Aide » → « Help » (i18n). ✅

## 7. Pistes pour la suite (optionnel)

- **i18n** : `loading-utils.ts` — fallback texte « Chargement... » remplacé par « Loading... ». ✅
- **Tests automatisés** : Intégrer @axe-core/cli ou playwright avec axe pour les régressions a11y (CI).
- **innerHTML** : Conventions en place : pas de recréation de SVG en JS (createElementNS) ; utiliser des chaînes SVG (innerHTML limité à l’icône) ou des composants Astro. Contenu serveur (résultats de recherche) injecté tel quel ; spinners via loading-utils (SVG string). ✅
- **Landmarks** : ✅ Pages sans sidebar (login, signup, etc.) : contenu dans `<main>`, hiérarchie vérifiée (section 6.4).

---

Ce document peut être mis à jour au fil des corrections.
