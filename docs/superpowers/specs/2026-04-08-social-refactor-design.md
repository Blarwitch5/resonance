# Resonance — Social Refactor Design Spec

**Date:** 2026-04-08
**Status:** Approved — full rewrite (not a patch)
**Scope:** Refonte complète de Resonance vers un modèle social-first (inspiré Letterboxd)

---

## 1. Vision

Resonance passe d'un outil de collection personnel à une app sociale publique où les amateurs de musique physique partagent leur shelf, suivent d'autres collectionneurs, et découvrent de nouveaux disques via leur réseau.

---

## 2. Stack

| Couche | Technologie | Notes |
|--------|-------------|-------|
| Frontend | Astro 6 + Tailwind v4 | Inchangé |
| Base de données | PostgreSQL + Prisma | Inchangé |
| Auth | better-auth | Inchangé |
| i18n | Système maison (`src/i18n/`) | EN + FR, extensible |
| Mobile | Capacitor (shell natif) | Ajouté |
| Push | `@capacitor/push-notifications` | Ajouté |
| Camera | `@capacitor/camera` | Fallback web conservé |
| Email transactionnel | Resend (ou Postmark) | Ajouté — notifications email |

---

## 3. Navigation

Bottom bar à 5 entrées :

```
Feed · Shelf · [+] · Explore · Profile
```

- **Feed** — activité des follows
- **Shelf** — collection personnelle
- **[+]** — FAB flottant *au-dessus* de la bottom bar (pas un onglet de navigation à part entière) — ajout rapide (scan / recherche)
- **Explore** — découverte communauté + search global
- **Profile** — profil public de l'utilisateur connecté

> Note : le `[+]` est un FAB positionné en `absolute` au centre de la bottom bar. Il ne correspond pas à un onglet actif et ne change pas l'état de sélection de la nav.

---

## 4. Feed

- Rich cards avec cover, artiste, titre, action de l'utilisateur suivi
- Bouton "+ Want" contextuel sur chaque card
- Activités affichées : ajout shelf · Want · nouvelle collection · note/rating · like · commentaire · nouveau follow
- Pagination cursor-based (chargement infini) — curseur composite `(createdAt, id)` pour garantir l'unicité
- État vide (aucun follow) : suggestions de profils à suivre + tendances communauté
- **Implémentation requête feed :** une seule requête `WHERE userId IN (followingIds) ORDER BY createdAt DESC` — pas de loop par follow. `followingIds` est résolu en amont en une requête `Follow` séparée.

---

## 5. Shelf

- Vue grille par défaut
- Tap sur card → overlay avec 3 actions max (Éditer · Want · Supprimer)
- Vue liste + swipe disponible dans les settings
- Pas de bulk mode
- Pills de format en haut (Vinyl · CD · Cassette), search, tri
- Route : `/shelf?format=X` (pages `/vinyl`, `/cd`, `/cassette` supprimées)

---

## 6. Profil public `/u/[username]`

Style Letterboxd :

- Header : avatar, nom, bio courte
- Stats : Records · Collections · Followers · Following · Wants
- Section "Récemment ajoutés" (6 derniers items)
- Collections épinglées
- Bouton "Suivre" / "Ne plus suivre"
- Bouton "Bloquer" accessible via menu contextuel (⋯) — voir section 25
- Respect de la confidentialité : si compte privé, affiche uniquement les stats + bouton Suivre pour les non-followers

> `/profile` est un alias qui redirige en 302 vers `/u/[username]` de l'utilisateur connecté.

---

## 7. Formats

Vinyl · CD · Cassette conservés. Vinyl = format héro.
L'utilisateur choisit ses formats actifs dans les settings.

---

## 8. Wants (unifié)

Fusion des anciens Favoris + Wishlist en un seul concept **Wants** :

- Priorité optionnelle (haute / normale)
- Accessible depuis le feed, l'explore, les pages item, et les profils
- Bouton "+ Want" contextuel partout

---

## 9. Collections (anciennement "Lists")

Le modèle `List` est renommé `Collection` dans le schéma et dans tout le code.

- Collections publiques ou privées (champ `isPublic`)
- Affichées sur le profil public si publiques
- Collections épinglables sur le profil (jusqu'à 4 épinglées)
- Route : `/u/[username]/collections/[slug]`
- Le slug est **auto-généré depuis le titre** à la création (ex : "Ma Collection Jazz" → `ma-collection-jazz`), unique par utilisateur. En cas de collision, un suffixe numérique est ajouté (`ma-collection-jazz-2`)
- L'utilisateur ne saisit pas le slug manuellement

---

## 10. Item Detail `/items/[id]`

> **Note architecturale :** Un `Release` est une ressource partagée représentant une release Discogs (métadonnées immuables). Un `ShelfItem` est l'instance personnelle d'un utilisateur pour cette release (état de conservation, note, date d'acquisition). Voir section 16.

### Informations publiques (visibles par tous)

- Cover, artiste, titre, label, année, format, pays de pressage
- Tracklist
- Rating personnel du propriétaire (étoiles 1–5)
- Rating moyen communauté (affiché à partir de 3 ratings minimum) — calculé sur tous les `ShelfItem` liés à cette `Release`
- Followers qui ont aussi cet album ("X personnes que tu suis ont ce disque") — requête sur `ShelfItem` filtrée par les follows
- Bouton "+ Want" (si la release appartient à quelqu'un d'autre ou n'est pas encore dans la shelf)

### Informations personnelles (propriétaire uniquement)

- Note texte libre
- Date d'acquisition
- État de conservation : Mint · NM · EX · VG+ · VG · G

### Actions disponibles (propriétaire)

- Éditer les infos personnelles
- Modifier le rating
- Ajouter à une collection
- Supprimer de la shelf

---

## 11. Flow d'ajout — FAB `[+]`

1. Tap sur `[+]` → bottom sheet : **Scanner** / **Rechercher**
2. **Scanner** : caméra native (Capacitor) ou fallback web. Code-barres → résultat automatique
3. **Rechercher** : champ texte (artiste / titre / code-barres) → liste de résultats Discogs
4. Sélection → form inline :
   - Format (Vinyl / CD / Cassette) — obligatoire
   - État de conservation — obligatoire
   - Note personnelle — optionnel
5. Confirmation → création d'un `ShelfItem` lié à la `Release` Discogs + activité `ADD_ITEM` créée

---

## 12. Explore `/explore`

- Barre de recherche globale (artiste / titre / label) → résultats Discogs paginés
- Section **Tendances** — albums les plus ajoutés cette semaine dans la communauté
- Section **Nouveaux membres actifs** — profils récemment rejoints avec activité
- Page de détail release `/explore/[discogsId]` : metadata complète + qui dans ton réseau a cet album + bouton "+ Want" / "Ajouter à ma shelf"

---

## 13. Activités sociales

### Types d'activités

| Enum | Description |
|------|-------------|
| `ADD_ITEM` | Ajout d'un item à la shelf |
| `ADD_WANT` | Ajout d'un Want |
| `RATE_ITEM` | Note d'un item (1–5 étoiles) |
| `CREATE_COLLECTION` | Création d'une collection |
| `ADD_TO_COLLECTION` | Ajout d'un item à une collection |
| `FOLLOW_USER` | Un utilisateur commence à en suivre un autre |

### Interactions sur les activités

- **Like** — `ActivityLike` : un utilisateur connecté peut liker une activité
- **Commentaire** — `ActivityComment` : texte libre (max 280 caractères)
- Ces deux interactions sont visibles dans le feed et sur la page item

---

## 14. Notifications

### Types

| Type | Déclencheur |
|------|-------------|
| `NEW_FOLLOWER` | Quelqu'un commence à te suivre |
| `NEW_SHELF_ADD` | Un utilisateur suivi ajoute un item à sa shelf (max 1 notification par utilisateur suivi par période de 2h — voir ci-dessous) |
| `ACTIVITY_LIKE` | Quelqu'un like ton activité |
| `ACTIVITY_COMMENT` | Quelqu'un commente ton activité |

### Règle anti-spam sur `NEW_SHELF_ADD`

Pour éviter le bruit : si un utilisateur suivi ajoute plusieurs items en moins de 2h, une seule notification groupée est envoyée ("Alex a ajouté 3 disques").

**Implémentation :** `upsert` sur la clé composite `(userId, fromUserId, type, windowStart)` avec `increment` du compteur `count`. `windowStart` = début de la fenêtre 2h courante (arrondi à l'heure paire). Pas de verrou, pas de race condition — l'`upsert` est atomique côté Postgres.

### Centre de notifications

- Page `/notifications` accessible via icône dans le header ou le profil
- Badge de compteur non lus sur l'icône
- Marquer comme lu (individuel ou tout marquer)
- Chaque notification est cliquable → redirige vers l'activité ou le profil concerné

### Push (Capacitor)

- Opt-in explicite au premier lancement (permission iOS/Android)
- Token stocké dans le modèle `PushToken` (voir section 16)
- Chaque type activable/désactivable indépendamment dans les settings

### Email (Resend / Postmark)

- Envoi uniquement pour : `NEW_FOLLOWER` et `ACTIVITY_COMMENT`
- Uniquement si l'utilisateur n'a pas lu la notification en app dans les 15 minutes
- Désactivable dans les settings (indépendamment du push)
- Format : email transactionnel simple, lien CTA vers la page concernée

---

## 15. Settings

| Section | Contenu |
|---------|---------|
| Profil | Changer avatar · Changer nom d'affichage · Modifier bio |
| Compte | Changer email · Changer mot de passe · Connexions OAuth |
| Confidentialité | Compte privé (on/off) |
| Shelf | Formats actifs (Vinyl/CD/Cassette) · Vue par défaut (grille/liste) |
| Notifications — Push | Nouveau follower · Ajout shelf · Like · Commentaire (chacun on/off) |
| Notifications — Email | Nouveau follower · Commentaire (chacun on/off) |
| Langue | FR / EN |
| Données | Export de mes données (RGPD) — inclut : profil, shelf, collections, wants, activités, commentaires |
| Danger zone | Supprimer mon compte |

---

## 16. Data Model — Schéma Prisma cible

### Principe architectural : `Release` vs `ShelfItem`

Un même disque physique (release Discogs) peut appartenir à plusieurs utilisateurs. Le schéma sépare donc :

- **`Release`** — métadonnées immuables d'une release Discogs (titre, artiste, label, année, cover, tracklist…). Partagée entre tous les utilisateurs. Créée à la première fois qu'un utilisateur ajoute ce disque.
- **`ShelfItem`** — instance personnelle d'un utilisateur pour une `Release` (état de conservation, note personnelle, date d'acquisition, rating). Un utilisateur ne peut avoir qu'un seul `ShelfItem` par `Release`.

Cela permet nativement : les ratings communautaires, le "X amis ont ce disque", et les tendances.

### Renommages

- `List` → `Collection`, `ListItem` → `CollectionItem`, table `lists` → `collections`, `list_items` → `collection_items`
- Champ `ShelfItem.condition` : valeurs alignées sur `"Mint" | "NM" | "EX" | "VG+" | "VG" | "G"`

### Modèles complets (nouveaux et modifiés)

```prisma
// Release Discogs — ressource partagée
model Release {
  id           String      @id @default(cuid())
  discogsId    String      @unique
  title        String
  artist       String
  label        String?
  year         Int?
  country      String?
  format       String      // "Vinyl" | "CD" | "Cassette"
  coverUrl     String?
  tracklist    Json?
  // Dénormalisés pour éviter un AVG() à la volée — mis à jour via prisma.$transaction à chaque ajout/modif de rating
  avgRating    Float?
  ratingCount  Int         @default(0)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  shelfItems   ShelfItem[]
  wants        Want[]

  @@map("releases")
}

// Instance personnelle d'une release dans la shelf d'un utilisateur
model ShelfItem {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  releaseId   String
  release     Release   @relation(fields: [releaseId], references: [id])
  condition   String    // "Mint" | "NM" | "EX" | "VG+" | "VG" | "G"
  rating      Int?      // 1–5
  note        String?
  acquiredAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  collectionItems CollectionItem[]
  activities      Activity[]

  @@unique([userId, releaseId])
  @@index([userId])
  @@index([releaseId])
  @@index([createdAt])  // trending queries : albums les plus ajoutés cette semaine
  @@map("shelf_items")
}

// Want — liste d'envies unifiée (ex Favoris + Wishlist)
model Want {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  releaseId String
  release   Release   @relation(fields: [releaseId], references: [id])
  priority  String    @default("normal") // "high" | "normal"
  createdAt DateTime  @default(now())

  @@unique([userId, releaseId])
  @@index([userId])
  @@map("wants")
}

// Follow — relation sociale entre utilisateurs
model Follow {
  id          String   @id @default(cuid())
  followerId  String
  follower    User     @relation("Following", fields: [followerId], references: [id], onDelete: Cascade)
  followingId String
  following   User     @relation("Followers", fields: [followingId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())

  @@unique([followerId, followingId])
  @@index([followerId])
  @@index([followingId])
  @@map("follows")
}

// Block — blocage d'un utilisateur
model UserBlock {
  id        String   @id @default(cuid())
  blockerId String
  blocker   User     @relation("Blocking", fields: [blockerId], references: [id], onDelete: Cascade)
  blockedId String
  blocked   User     @relation("BlockedBy", fields: [blockedId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([blockerId, blockedId])
  @@index([blockerId])
  @@map("user_blocks")
}

// Like sur une activité
model ActivityLike {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  activityId String
  activity   Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@unique([userId, activityId])
  @@index([activityId])
  @@map("activity_likes")
}

// Commentaire sur une activité
model ActivityComment {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  activityId String
  activity   Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  text       String   @db.VarChar(280)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([activityId])
  @@map("activity_comments")
}

// Token push Capacitor par device
model PushToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  platform  String   // "ios" | "android" | "web"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@map("push_tokens")
}

// Mise à jour de l'enum ActivityType
enum ActivityType {
  ADD_ITEM
  ADD_WANT
  RATE_ITEM
  CREATE_COLLECTION   // ex CREATE_LIST
  ADD_TO_COLLECTION   // ex ADD_TO_LIST
  FOLLOW_USER
}

// Index composite sur Activity pour la requête feed
// WHERE userId IN (...) ORDER BY createdAt DESC — sans cet index = full table scan
// @@index([userId, createdAt]) à ajouter sur le modèle Activity (en plus des index existants)

// Mise à jour de NotificationType
enum NotificationType {
  NEW_FOLLOWER
  NEW_SHELF_ADD
  ACTIVITY_LIKE
  ACTIVITY_COMMENT
}
```

### Ajouts sur le modèle `User`

```prisma
// Relations sociales
following        Follow[]     @relation("Following")
followers        Follow[]     @relation("Followers")
blocking         UserBlock[]  @relation("Blocking")
blockedBy        UserBlock[]  @relation("BlockedBy")
// Collections épinglées (max 4, simple flag isPinned sur Collection)
pushTokens       PushToken[]
wants            Want[]
shelfItems       ShelfItem[]
activityLikes    ActivityLike[]
activityComments ActivityComment[]
```

### Modèle `Collection` (ex-List)

```prisma
model Collection {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title       String
  slug        String   // auto-généré depuis le titre, unique par userId
  description String?
  isPublic    Boolean  @default(true)
  isPinned    Boolean  @default(false)  // épinglé sur le profil (max 4 vérifiés applicativement)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  items       CollectionItem[]

  @@unique([userId, slug])
  @@index([userId])
  @@map("collections")
}
```

> Le champ `isPinned` est un booléen simple sur la collection de l'utilisateur. La limite de 4 collections épinglées est vérifiée applicativement avant la mise à jour. Il n'y a pas de relation many-to-many `pinnedBy` — un utilisateur ne peut épingler que ses propres collections.

---

## 17. Internationalisation (i18n)

- Langues : **FR** et **EN** (infrastructure existante dans `src/i18n/`)
- Locale stockée en préférence utilisateur (DB) + détection navigateur en fallback
- Pas de préfixe d'URL (`/fr/`, `/en/`) — locale cookie-based
- Chaque nouvelle page et composant doit avoir ses clés i18n dans les deux langues
- Les contenus utilisateur (notes, bio, titres de collections) ne sont pas traduits — ils restent dans la langue de saisie

---

## 18. Confidentialité

- **Par défaut : public** — profil et shelf visibles par tous, y compris non connectés
- **Compte privé** — option globale dans les settings :
  - Profil masqué aux non-followers (stats + bouton Suivre visible uniquement)
  - Shelf et collections masquées aux non-followers
  - Profil non indexé (`noindex`)
  - Activités non visibles dans le feed des non-followers
- Le compte privé est vérifié côté serveur sur toutes les routes concernées (page profil, API shelf, API feed)

---

## 19. Accessibilité

Cible : **WCAG 2.1 AA + mobile-first**

- Tap targets minimum 44×44px
- Bottom bar navigable au lecteur d'écran (VoiceOver / TalkBack) avec labels ARIA
- Focus visible sur tous les éléments interactifs
- Swipe actions avec alternative tap
- Contraste AA minimum sur tous les textes
- Covers : `alt="[Artiste] — [Titre]"`

---

## 20. Sécurité

- **better-auth** — sessions sécurisées, CSRF protection
- **IDOR** — toutes les routes API vérifient que l'utilisateur authentifié est propriétaire de la ressource avant modification ou suppression
- **XSS** — les champs utilisateur (notes, bio, descriptions, commentaires) sont sanitisés côté serveur avant persistance
- **Rate limiting** — routes sensibles limitées : follow/unfollow/block, create item, search, add want, comment
- **Compte privé** — enforcement côté serveur sur toutes les routes de lecture (profil, shelf, feed)
- **Blocage** — un utilisateur bloqué ne peut pas voir le profil de celui qui l'a bloqué, ni lui envoyer des likes/commentaires. Les routes API vérifient l'absence de blocage mutuel.
- **Suppression de compte** — purge complète en cascade : items, wants, collections, activités, follows, blocks, notifications, push tokens
- **Push tokens** — liés à l'utilisateur, supprimés à la déconnexion et à la suppression de compte
- **Pas de données sensibles côté client**
- **Profils privés** — `noindex` via meta tag + header HTTP `X-Robots-Tag`
- **Export RGPD** — `GET /api/profile/export` limité à 1 requête par utilisateur par heure (vérification en DB : champ `User.lastExportAt DateTime?`, rejeté avec 429 si < 1h)

---

## 21. Capacitor — Stratégie mobile

- Shell natif Capacitor wrappant l'app Astro (web-first)
- Plugins : `@capacitor/push-notifications` + `@capacitor/camera`
- Fallback web pour le scanner (`BarcodeScanner.client.ts` conservé)
- Build iOS + Android via CI

---

## 22. Landing page `/`

La landing est la page de conversion principale pour les utilisateurs non connectés.

**Contenu minimal v1 :**

- Headline + sous-titre (valeur proposition de Resonance)
- Mockup ou screenshot de l'app (shelf ou feed)
- CTA principal : "Créer un compte" → `/signup`
- CTA secondaire : "Se connecter" → `/login`
- Section "Rejoindre la communauté" : nombre de membres et disques enregistrés (stats publiques)
- Footer : liens légaux

Les utilisateurs connectés sont redirigés vers `/feed`.

---

## 23. Onboarding (premier lancement)

Après la création de compte, l'utilisateur traverse un flow en 3 étapes (skippable) :

1. **Formats** — Quels formats collectionnes-tu ? (Vinyl / CD / Cassette — multiselect)
2. **Trouve des amis** — Recherche par username ou email. Suggestions de profils actifs si aucun résultat.
3. **Premier ajout** — Invite directe à ajouter un premier disque via le FAB. Si skippé, l'état vide de la shelf affiche le même CTA.

L'onboarding est stocké comme complété dans la DB (`User.onboardingCompleted Boolean @default(false)`). Il ne réapparaît pas après avoir été terminé ou skippé.

---

## 24. Blocage utilisateur

- Accessible via le menu contextuel (⋯) sur le profil public `/u/[username]`
- Bloquer un utilisateur : **transaction atomique** `prisma.$transaction([deleteFollow, createUserBlock])` — le follow est supprimé et le `UserBlock` créé dans la même transaction. Pas de state intermédiaire possible.
- Effets du blocage :
  - Le profil bloqué n'apparaît plus dans le feed, l'explore, ni les suggestions
  - Le compte bloqué ne peut pas voir le profil du bloqueur
  - Toute tentative d'interaction (like, commentaire, follow) depuis un compte bloqué est rejetée avec une 403
- Déblocage possible depuis les settings (section "Confidentialité" → "Comptes bloqués")
- Pas de notification envoyée au bloqué

---

## 25. Pages et routes

### Pages Astro

| Route | Description |
|-------|-------------|
| `/` | Landing si non connecté · Redirect → `/feed` si connecté |
| `/feed` | Feed d'activité |
| `/shelf` | Collection personnelle |
| `/explore` | Explore + search |
| `/explore/[discogsId]` | Détail release Discogs |
| `/profile` | Redirect 302 → `/u/[username]` de l'utilisateur connecté |
| `/u/[username]` | Profil public d'un utilisateur |
| `/items/[id]` | Détail d'un ShelfItem |
| `/collections` | Liste des collections de l'utilisateur |
| `/u/[username]/collections/[slug]` | Détail d'une collection |
| `/collections/new` | Création d'une collection |
| `/notifications` | Centre de notifications |
| `/settings` | Settings |
| `/login` | Connexion |
| `/signup` | Inscription |
| `/onboarding` | Flow premier lancement (post-signup) |
| `/forgot-password` | Mot de passe oublié |
| `/reset-password` | Réinitialisation mot de passe |

### Routes API clés (nouvelles ou modifiées)

| Route | Description |
|-------|-------------|
| `GET /api/feed` | Feed paginé (cursor composite `createdAt` + `id`) |
| `POST /api/users/[username]/follow` | Follow / unfollow |
| `POST /api/users/[username]/block` | Bloquer / débloquer |
| `GET /api/notifications` | Liste des notifications |
| `PATCH /api/notifications/read` | Marquer comme lues |
| `POST /api/push-tokens` | Enregistrer un token push |
| `DELETE /api/push-tokens/[token]` | Supprimer un token push |
| `GET /api/explore/trending` | Albums tendances |
| `GET /api/explore/new-members` | Nouveaux membres actifs |
| `POST /api/activities/[id]/like` | Like / unlike une activité |
| `POST /api/activities/[id]/comment` | Commenter une activité |
| `GET /api/profile/export` | Export RGPD (profil, shelf, collections, wants, activités, commentaires) |
| `GET /api/releases/[discogsId]` | Récupérer ou créer une Release depuis Discogs |

---

## 26. Features supprimées

| Feature | Raison |
|---------|--------|
| Bulk actions | Complexité UX, peu utilisé |
| Pages `/vinyl`, `/cd`, `/cassette` | Remplacées par `/shelf?format=X` |
| Favoris séparés | Fusionnés dans Wants |
| Wishlist séparée | Fusionnée dans Wants |
| Stats complexes | Remplacées par 4–5 chiffres clés sur le profil |
| Boutons rapides sur cards | Remplacés par tap overlay |
| Route `/explorer/[discogsId]` | Renommée `/explore/[discogsId]` (correction coquille) |

---

## 27. Stratégie de performance

### Requêtes

- **Feed** : une seule requête `Activity` avec `WHERE userId IN (followingIds)` — pas de N+1. Les `followingIds` sont résolus en amont en une requête `Follow` séparée.
- **Profil public** : stats + items récents + collections chargés en `Promise.all()` — 3 requêtes en parallèle, pas en séquence.
- **Trending** : `GROUP BY releaseId COUNT(*)` sur `ShelfItem` filtrée sur `createdAt > now() - 7 days`, rendu possible par `@@index([createdAt])`.
- **Rating moyen** : lu depuis `Release.avgRating` (dénormalisé) — pas de `AVG()` à la volée. Mis à jour via `prisma.$transaction` à chaque ajout ou modification de rating.

### Cache HTTP

- Pages publiques (`/u/[username]`, `/explore`) : `Cache-Control: s-maxage=60, stale-while-revalidate=300` — Vercel Edge Cache sert le HTML statale pendant 5 minutes sans toucher le serveur.
- Pages authentifiées (feed, shelf) : `Cache-Control: no-store` — jamais mises en cache.

### Images

- Covers Discogs : optimisées via **Vercel Image Optimization** — composant `<Image>` Astro avec `src` externe autorisé dans `astro.config.ts` (`image.domains`). Resize automatique, format WebP, lazy loading.
- Avatars : servis depuis Vercel Blob (prod) ou `/uploads/avatars/` (dev) — pas de traitement supplémentaire nécessaire.

---

## 28. Hors scope (v1)

- Tendances hebdo par notification push (job schedulé)
- Back-office / curation éditoriale de l'Explore
- Granularité de confidentialité par item
- Haptics / status bar natifs Capacitor
- Recommandations algorithmiques
- Signalement de contenu / modération back-office
- Email digest hebdomadaire
