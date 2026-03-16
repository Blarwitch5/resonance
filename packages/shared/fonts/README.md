# Fonts Partagées Resonance

Ce dossier contient les fonts partagées pour les workspaces `app` et `landing` du projet Resonance.

## 🔒 Conformité RGPD

- ✅ **100% local** : Aucune requête externe vers Google Fonts
- ✅ **Pas de tracking** : Aucune donnée personnelle envoyée à des tiers
- ✅ **Contrôle total** : Gestion complète des fonts

## 📁 Structure

```
packages/shared/fonts/
├── fonts.css                    # Définitions @font-face
├── Inter-*.woff2               # Police système (400, 500, 600, 700)
├── PlusJakartaSans-*.woff2     # Police display (400, 500, 600, 700)
└── README.md                   # Ce fichier
```

## 🎯 Polices disponibles

### Inter (Police système)

- **Usage** : Texte principal, interface utilisateur
- **Poids** : 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
- **Caractéristiques** : Optimisée pour l'affichage à l'écran

### Plus Jakarta Sans (Police display)

- **Usage** : Titres, éléments d'interface importants
- **Poids** : 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
- **Caractéristiques** : Moderne, inspirée de Jakarta

## 🚀 Utilisation

### Dans l'app (`app/`)

```css
/* Import dans src/styles/global.css */
@import '../../../packages/shared/fonts/fonts.css';
```

### Dans la landing (`landing/`)

```css
/* Import dans src/styles/global.css */
@import '../../../packages/shared/fonts/fonts.css';
```

### Préchargement (optionnel)

```html
<link
  rel="preload"
  href="/packages/shared/fonts/Inter-Regular.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
<link
  rel="preload"
  href="/packages/shared/fonts/Inter-SemiBold.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

## ⚡ Performance

- **Format WOFF2** : Compression optimale
- **font-display: swap** : Affichage immédiat avec fallback
- **unicode-range** : Chargement sélectif des caractères
- **Préchargement** : Chargement prioritaire des fonts critiques

## 🔄 Mise à jour

Pour mettre à jour les fonts :

1. Télécharger les nouvelles versions depuis Google Fonts
2. Remplacer les fichiers `.woff2` dans ce dossier
3. Mettre à jour les définitions dans `fonts.css` si nécessaire

## 📊 Taille des fichiers

- **Inter** : ~6.5 KB (4 poids)
- **Plus Jakarta Sans** : ~6.5 KB (4 poids)
- **Total** : ~17.5 KB (optimisé pour le web)

## 🎨 Intégration Tailwind

Les fonts sont configurées dans `tailwind.config.mjs` :

```javascript
fontFamily: {
  sans: ['Inter', 'ui-sans-serif', 'system-ui'],
  display: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui'],
  mono: ['ui-monospace', 'monospace'],
}
```
