# 🎵 Resonance Monorepo

Application moderne de gestion de collection musicale multi-formats avec API Discogs intégrée.

## 📁 Structure du Projet

```
Resonance/
├── landing/              # Site marketing (domain.com)
│   ├── src/pages/       # Pages Landing
│   └── package.json     # Dépendances minimales
├── app/                  # Application Resonance (app.domain.com)
│   ├── src/pages/       # Dashboard, Collections, Multi-format management
│   ├── prisma/          # Schema base de données
│   └── package.json     # Full stack (Prisma, Clerk, Auth)
├── package.json          # Monorepo workspace
└── DEPLOYMENT_GUIDE.md  # Instructions déploiement
```

## 🚀 Démarrage Rapide

### **Développement complet (Landing + App)**

```bash
npm run dev
```

### **Projets séparés**

```bash
npm run dev:landing     # → http://localhost:4321 (Marketing)
npm run dev:app        # → http://localhost:4322 (Application)
```

### **Build complet**

```bash
npm run build
```

## ⚡ Technologies

**Landing Marketing :**

- [x] Astro minimal
- [x] Tailwind CSS
- [x] Glass-morphism modern design

**Application Resonance :**

- [x] Astro SSR + Vercel
- [x] Prisma + PostgreSQL (Neon)
- [x] Clerk Auth integration
- [x] Discogs API
- [x] Dashboard gestion collections multi-formats

## 🎯 Fonctionnalités

- 📱 **Landing** → Présentation + Call-to-Action → redirect app
- 🎵 **App** → Gestion complète collections (Vinyl, CD, Cassette)
- 🔍 Scan codes-barres → import API Discogs
- 📊 Analyse et statistiques collection
- 🏷️ Organisation collections multiples
- 💫 Interface mobile-first avec navigation bottom bar
- 🌈 Identité visuelle moderne (violet électrique / cuivre chaud)

## 🎨 Identité Visuelle

**Palette Resonance :**

- Nuit profonde : `#0F0F1A` (fond principal)
- Violet électrique : `#6B4EFF` (accent primaire)
- Cuivre chaud : `#B77A4B` (accent rétro)
- Gris bleuté : `#D7D9E0` (texte secondaire)
- Blanc crème : `#F8F7F3` (surfaces claires)

## 📋 Déploiement

Voir [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) pour instructions complètes Vercel.

---

**Resonance par Blarwitch** 🎵 | © 2025 | _Where your music resonates_
