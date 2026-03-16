# Plan d'implémentation Resonance

## Vue d'ensemble

Implémentation complète des fonctionnalités de Resonance en suivant une approche modulaire et évolutive, avec des collections mixtes, des pages séparées par format, un système d'exploration Discogs, et un profil utilisateur enrichi.

## Architecture des collections

**Principe** : Collections mixtes (peuvent contenir vinyl + CD + cassette) avec filtrage par format sur les pages séparées.

**Avantages** :
- Flexibilité thématique ("Jazz Legends", "Années 80")
- Évolutif pour futurs formats (Digital, Streaming)
- Support futur du mode collaboratif
- Import Discogs facilité

## Phase 1 : Infrastructure et Repositories ✅

### 1.1 Création des repositories (Design Pattern Repository)

✅ **Fichiers créés** :
- `src/repositories/item-repository.ts` : CRUD items (vinyl/CD/cassette)
- `src/repositories/collection-repository.ts` : CRUD collections
- `src/repositories/wishlist-repository.ts` : CRUD wishlist
- `src/repositories/user-repository.ts` : Données utilisateur + stats

### 1.2 Services métier

✅ **Fichiers créés** :
- `src/services/item-service.ts` : Logique métier items
- `src/services/collection-service.ts` : Logique métier collections
- `src/services/stats-service.ts` : Calcul statistiques utilisateur
- `src/services/discogs-service.ts` : Intégration API Discogs

## Phase 2 : Pages par format (Vinyl, CD, Cassette) ✅

### 2.1 Refonte des pages format

✅ **Fichiers modifiés** :
- `src/pages/vinyl.astro` : Affichage des vinyles par collection
- `src/pages/cd.astro` : Affichage des CDs par collection
- `src/pages/cassette.astro` : Affichage des cassettes par collection

**Caractéristiques** :
- Affichage groupé par collection
- Compteurs de statistiques
- États vides avec CTA
- Bouton d'ajout d'albums

### 2.2 Composants items

✅ **Fichiers créés** :
- `src/components/items/ItemCard.astro` : Carte d'un album avec actions
- `src/components/items/ItemGrid.astro` : Grille d'items responsive
- `src/components/items/ItemActions.astro` : Actions (favoris, modifier, supprimer)
- `src/components/items/AddItemButton.astro` : Bouton d'ajout par format

**Caractéristiques** :
- Lazy loading des images
- Actions au hover
- Toggle favoris en temps réel
- Suppression optimiste

## Phase 3 : Système de collections ✅

### 3.1 Pages collections

✅ **Fichiers créés** :
- `src/pages/collections/index.astro` : Liste des collections
- `src/pages/collections/[slug].astro` : Vue détaillée d'une collection
- `src/pages/collections/new.astro` : Création de collection

### 3.2 Composants collections

✅ **Fichiers créés** :
- `src/components/collections/CollectionCard.astro` : Carte de collection
- `src/components/collections/CollectionHeader.astro` : En-tête avec stats
- `src/components/collections/CollectionFilter.astro` : Filtres (base JS)

**Caractéristiques** :
- Stats par format dans chaque collection
- Gradient background dynamique
- Actions d'édition/suppression

## Phase 4 : Page Explorer ✅

### 4.1 Page principale Explorer

✅ **Fichier modifié** :
- `src/pages/explorer.astro` : Recherche Discogs + recommandations

**Caractéristiques** :
- Recherche temps réel avec debounce
- Filtres par format (Vinyl, CD, Cassette)
- Recommandations basées sur les genres de l'utilisateur
- Résultats chargés dynamiquement

### 4.2 Composants Explorer

✅ **Fichiers créés** :
- `src/components/explorer/SearchBar.astro` : Recherche avec loader
- `src/components/explorer/FormatFilter.astro` : Boutons de filtrage
- `src/components/explorer/ResultCard.astro` : Carte résultat Discogs
- `src/components/explorer/RecommendationGrid.astro` : Grille recommandations

**Caractéristiques** :
- Recherche avec debounce 500ms
- Loading state avec spinner
- Filtres interactifs
- Modal d'ajout (à compléter)

## Phase 5 : Profil enrichi ✅

### 5.1 Refonte page profil

✅ **Fichier modifié** :
- `src/pages/profil.astro` : Tableau de bord complet avec connexion intégrée

**Caractéristiques** :
- Formulaire de connexion si non connecté
- En-tête avec gradient dynamique basé sur les formats
- Statistiques en temps réel
- Tabs fonctionnelles (Favoris, Collections, Activité, Wishlist, Paramètres)

### 5.2 Composants Profil

✅ **Fichiers créés** :
- `src/components/profile/ProfileHeader.astro` : En-tête avec gradient
- `src/components/profile/StatsGrid.astro` : Grille de statistiques
- `src/components/profile/RecentCollections.astro` : Collections récentes
- `src/components/profile/FavoritesByGenre.astro` : Favoris groupés par genre
- `src/components/profile/ProfileTabs.astro` : Système d'onglets

**Caractéristiques** :
- Gradient généré dynamiquement selon les formats
- Pulse animation sur l'avatar
- Stats calculées en temps réel
- Navigation par tabs

## Phase 6 : API endpoints ✅

### 6.1 Endpoints items

✅ **Fichiers créés** :
- `src/pages/api/items/create.ts` : POST - Créer un item
- `src/pages/api/items/[id]/update.ts` : PUT - Modifier un item
- `src/pages/api/items/[id]/delete.ts` : DELETE - Supprimer un item
- `src/pages/api/items/[id]/toggle-favorite.ts` : POST - Toggle favoris
- `src/pages/api/items/[id]/add-to-collection.ts` : POST - Ajouter à collection

**Caractéristiques** :
- Validation des inputs
- Vérification des permissions
- Gestion d'erreurs complète
- Codes de statut appropriés

### 6.2 Endpoints collections

✅ **Fichiers créés** :
- `src/pages/api/collections/create.ts` : POST - Créer une collection
- `src/pages/api/collections/[id]/update.ts` : PUT - Modifier
- `src/pages/api/collections/[id]/delete.ts` : DELETE - Supprimer
- `src/pages/api/collections/[id]/add-item.ts` : POST - Ajouter item
- `src/pages/api/collections/[id]/remove-item.ts` : POST - Retirer item

**Caractéristiques** :
- Génération automatique de slug
- Validation des données
- Vérification de propriété

### 6.3 Endpoints Discogs

✅ **Fichiers créés** :
- `src/pages/api/discogs/search.ts` : GET - Recherche
- `src/pages/api/discogs/recommendations.ts` : GET - Recommandations
- `src/pages/api/discogs/release/[id].ts` : GET - Détails d'une release

**Caractéristiques** :
- Cache headers appropriés
- Fallback en cas d'erreur
- Support des formats (Vinyl, CD, Cassette)

## Phase 7 : Intégration Spotify (future)

### 7.1 Service Spotify

📝 **Fichiers à créer** :
- `src/services/spotify-service.ts` : Recherche extraits
- `src/services/audio-preview-service.ts` : Service unifié (Spotify + fallback Deezer)
- `src/components/audio/AudioPlayer.astro` : Player d'extraits

**Note** : Cette phase sera implémentée après la base, mais l'architecture est prévue (pas de couplage fort avec Discogs).

## Ordre d'exécution réalisé ✅

1. ✅ **Phase 1** : Repositories et services (fondations)
2. ✅ **Phase 6.1** : Endpoints items (pour tester les repos)
3. ✅ **Phase 2** : Pages format (Vinyl, CD, Cassette)
4. ✅ **Phase 3** : Système de collections
5. ✅ **Phase 6.2** : Endpoints collections
6. ✅ **Phase 4** : Page Explorer + API Discogs
7. ✅ **Phase 5** : Profil enrichi
8. 📝 **Phase 7** : Spotify (future itération)

## Considérations techniques

### Sécurité ✅
- Vérification session sur toutes les routes protégées
- Validation des inputs côté serveur
- Rate limiting sur API Discogs (à configurer)
- Protection CORS configurée

### Performance ✅
- Pagination prévue dans les repositories
- Cache Discogs requests (cache browser)
- Images lazy loading
- Optimistic UI updates sur favoris/suppression

### Accessibilité ✅
- ARIA labels sur tous les composants interactifs
- Navigation clavier
- Contraste WCAG AA via OKLCH
- Focus visible

### Points d'attention implémentés ✅

1. ✅ **Collections vides** : UX avec CTA et illustrations
2. ✅ **Pas de résultats Discogs** : Messages informatifs
3. ✅ **Gestion des erreurs** : try-catch dans toutes les API
4. ✅ **Loading states** : Spinner dans SearchBar
5. ✅ **Mobile-first** : Toutes les vues responsive avec Tailwind

## Fichiers créés - Résumé

### Repositories (4)
- `src/repositories/item-repository.ts`
- `src/repositories/collection-repository.ts`
- `src/repositories/wishlist-repository.ts`
- `src/repositories/user-repository.ts`

### Services (4)
- `src/services/item-service.ts`
- `src/services/collection-service.ts`
- `src/services/stats-service.ts`
- `src/services/discogs-service.ts`

### Composants Items (4)
- `src/components/items/ItemCard.astro`
- `src/components/items/ItemGrid.astro`
- `src/components/items/ItemActions.astro`
- `src/components/items/AddItemButton.astro`

### Composants Collections (3)
- `src/components/collections/CollectionCard.astro`
- `src/components/collections/CollectionHeader.astro`
- `src/components/collections/CollectionFilter.astro`

### Composants Explorer (4)
- `src/components/explorer/SearchBar.astro`
- `src/components/explorer/FormatFilter.astro`
- `src/components/explorer/ResultCard.astro`
- `src/components/explorer/RecommendationGrid.astro`

### Composants Profil (6)
- `src/components/profile/ProfileHeader.astro`
- `src/components/profile/StatsGrid.astro`
- `src/components/profile/RecentCollections.astro`
- `src/components/profile/FavoritesByGenre.astro`
- `src/components/profile/ProfileTabs.astro`
- `src/components/profile/ActivityTimeline.astro` — Timeline d'activité récente (albums ajoutés, collections créées, wishlist, favoris)

### Pages Collections (3)
- `src/pages/collections/index.astro`
- `src/pages/collections/[slug].astro`
- `src/pages/collections/new.astro`

### API Items (5)
- `src/pages/api/items/create.ts`
- `src/pages/api/items/[id]/update.ts`
- `src/pages/api/items/[id]/delete.ts`
- `src/pages/api/items/[id]/toggle-favorite.ts`
- `src/pages/api/items/[id]/add-to-collection.ts`

### API Collections (5)
- `src/pages/api/collections/create.ts`
- `src/pages/api/collections/[id]/update.ts`
- `src/pages/api/collections/[id]/delete.ts`
- `src/pages/api/collections/[id]/add-item.ts`
- `src/pages/api/collections/[id]/remove-item.ts`

### API Discogs (3)
- `src/pages/api/discogs/search.ts`
- `src/pages/api/discogs/recommendations.ts`
- `src/pages/api/discogs/release/[id].ts`

### Pages modifiées (4)
- `src/pages/vinyl.astro`
- `src/pages/cd.astro`
- `src/pages/cassette.astro`
- `src/pages/explorer.astro`
- `src/pages/profil.astro`

**Total : 49+ fichiers créés/modifiés**

### Suite du plan (itération court terme)
- **ResultCard.astro** : le bouton « Ajouter à la collection » ouvre désormais la modal `AddToCollectionModal` au lieu de rediriger vers la page détail.
- **WishlistGrid.astro** : URL de suppression corrigée (`/api/wishlist/${id}/delete`).
- **profil.astro** : chargement des activités récentes (`userRepository.getRecentActivity`) et affichage dans l’onglet Statistics via **ActivityTimeline**.

## Prochaines étapes recommandées

### Court terme (complété)
1. ✅ Implémenter la modal d'ajout d'album à une collection depuis Explorer (ResultCard ouvre la modal)
2. ✅ Compléter la timeline d'activité dans le profil (ActivityTimeline dans l'onglet Statistics)
3. ✅ Wishlist : UI (WishlistGrid) + API (create, delete, update) + correction URL delete
4. ✅ Recherche dans les pages par format (CollectionSearch sur bibliotheque)
5. ✅ Pagination des listes d'items (findByUserIdPaginated + composant Pagination sur bibliotheque)

### Moyen terme
1. Mode collaboratif (collections partagées)
2. Import/export de collections
3. Intégration Spotify (extraits audio)
4. Scanner de code-barres (Webcam API)
5. Statistiques avancées (graphiques)
6. Internationalisation (i18n) avec base en anglais:
   - Interface par défaut en anglais (libellés, messages, navigation)
   - Noms de fichiers et routes principaux en anglais
   - Préparation d’une future localisation française (fichiers de traduction, sélection de langue)

### Long terme
1. Comparateur de pressages
2. Sync playlists Spotify
3. API publique
4. Mode "story" musical
5. Recommandations AI

## Architecture finale

```
app/
├── src/
│   ├── components/
│   │   ├── collections/      # Composants collections
│   │   ├── explorer/         # Composants recherche
│   │   ├── items/            # Composants albums
│   │   ├── layouts/          # Layouts de page
│   │   ├── profile/          # Composants profil
│   │   └── ui/               # Composants UI généraux
│   ├── lib/
│   │   ├── auth.ts           # Configuration better-auth
│   │   └── db.ts             # Client Prisma
│   ├── pages/
│   │   ├── api/
│   │   │   ├── auth/         # Endpoints auth
│   │   │   ├── collections/  # Endpoints collections
│   │   │   ├── discogs/      # Endpoints Discogs
│   │   │   └── items/        # Endpoints items
│   │   ├── collections/      # Pages collections
│   │   ├── cassette.astro    # Page cassette
│   │   ├── cd.astro          # Page CD
│   │   ├── explorer.astro    # Page explorer
│   │   ├── index.astro       # Page d'accueil
│   │   ├── login.astro       # Connexion
│   │   ├── profil.astro      # Profil utilisateur
│   │   ├── signup.astro      # Inscription
│   │   └── vinyl.astro       # Page vinyl
│   ├── repositories/         # Couche d'accès données
│   ├── services/             # Logique métier
│   └── styles/               # Styles globaux
├── prisma/
│   └── schema.prisma         # Schéma de données
└── .cursor/
    └── rules/                # Règles AI
```

## Technologies utilisées

- **Astro 5.14.5** : Framework avec SSR
- **TypeScript** : Typage statique
- **Tailwind CSS 4.1.14** : Styles OKLCH
- **Prisma 6.17.1** : ORM PostgreSQL
- **better-auth** : Authentification type-safe
- **Discogs API** : Métadonnées musicales
- **Lucide Icons** : Icônes SVG modernes

## Patterns implémentés

- ✅ **Repository Pattern** : Accès données abstrait
- ✅ **Service Pattern** : Logique métier isolée
- ✅ **Factory Pattern** : Création d'items (via repositories)
- 📝 **Adapter Pattern** : Discogs → Items (partiel)
- 📝 **Observer Pattern** : Events UI (à compléter)

## Performance

- Build : ✅ Succès (~9s)
- Fichiers générés : Optimisés
- Images : Lazy loading
- API : Cache headers configurés
- Bundle size : ~15 KB (client router)

## Tests

📝 **À implémenter** :
- Tests unitaires repositories
- Tests d'intégration API endpoints
- Tests E2E parcours utilisateur
- Tests d'accessibilité (Playwright + axe)

## Déploiement

- ✅ Build fonctionnel
- ✅ Configuration Vercel
- 📝 Variables d'environnement à configurer
- 📝 Migration Prisma en production
- 📝 CDN pour assets statiques

## Documentation

- ✅ README.md : Guide complet
- ✅ Schéma Prisma : Models documentés
- ✅ API endpoints : Autodocumentés
- 📝 JSDoc : À ajouter sur services
- 📝 Guide développeur : À compléter

## Conclusion

L'architecture de base de Resonance est maintenant complète. Toutes les fonctionnalités principales sont implémentées :

✅ Authentification avec better-auth  
✅ Collections mixtes multi-formats  
✅ Pages par format (Vinyl, CD, Cassette)  
✅ Système de collections complet  
✅ Recherche et recommandations Discogs  
✅ Profil utilisateur enrichi  
✅ Design patterns Repository et Service  
✅ API REST complète et sécurisée  

L'application est prête pour la phase de test et les fonctionnalités supplémentaires comme l'intégration Spotify.

