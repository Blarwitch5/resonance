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

---

## 3. Navigation

Bottom bar à 5 entrées :

```
Feed · Shelf · [+] · Explore · Profile
```

- **Feed** — activité des follows
- **Shelf** — collection personnelle
- **[+]** — FAB central — ajout rapide (scan / recherche)
- **Explore** — découverte communauté + search global
- **Profile** — profil public de l'utilisateur connecté

---

## 4. Feed

- Rich cards avec cover, artiste, titre, action de l'utilisateur suivi
- Bouton "+ Want" contextuel sur chaque card
- Activités affichées : ajout shelf · Want · nouvelle collection · note/rating · like · commentaire
- Pagination cursor-based (chargement infini)
- État vide (aucun follow) : suggestions de profils à suivre + tendances communauté

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
- Respect de la confidentialité : si compte privé, affiche uniquement les stats + bouton Suivre pour les non-followers

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
- Collections épinglables sur le profil (champ `isPinned`)
- Route : `/collections/[slug]`

---

## 10. Item Detail `/items/[id]`

### Informations publiques (visibles par tous)

- Cover, artiste, titre, label, année, format, pays de pressage
- Tracklist
- Rating personnel du propriétaire (étoiles 1–5)
- Rating moyen communauté (affiché à partir de 3 ratings minimum)
- Followers qui ont aussi cet album ("X personnes que tu suis ont ce disque")
- Bouton "+ Want" (si l'item appartient à quelqu'un d'autre)

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
5. Confirmation → ajout à la shelf + activité `ADD_ITEM` créée

---

## 12. Explore `/explorer`

- Barre de recherche globale (artiste / titre / label) → résultats Discogs paginés
- Section **Tendances** — albums les plus ajoutés cette semaine dans la communauté
- Section **Nouveaux membres actifs** — profils récemment rejoints avec activité
- Page de détail release `/explorer/[discogsId]` : metadata complète + qui dans ton réseau a cet album + bouton "+ Want" / "Ajouter à ma shelf"

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
| `NEW_SHELF_ADD` | Un utilisateur suivi ajoute un item à sa shelf |
| `ACTIVITY_LIKE` | Quelqu'un like ton activité |
| `ACTIVITY_COMMENT` | Quelqu'un commente ton activité |

### Centre de notifications

- Page `/notifications` accessible via icône dans le header ou le profil
- Badge de compteur non lus sur l'icône
- Marquer comme lu (individuel ou tout marquer)
- Chaque notification est cliquable → redirige vers l'activité ou le profil concerné

### Push (Capacitor)

- Opt-in explicite au premier lancement (permission iOS/Android)
- Token stocké dans le modèle `PushToken` (voir section 16)
- Chaque type activable/désactivable indépendamment dans les settings

---

## 15. Settings

| Section | Contenu |
|---------|---------|
| Profil | Changer avatar · Changer nom d'affichage · Modifier bio |
| Compte | Changer email · Changer mot de passe · Connexions OAuth |
| Confidentialité | Compte privé (on/off) |
| Shelf | Formats actifs (Vinyl/CD/Cassette) · Vue par défaut (grille/liste) |
| Notifications | Nouveau follower · Ajout shelf · Like · Commentaire (chacun on/off) |
| Langue | FR / EN |
| Données | Export de mes données (RGPD) |
| Danger zone | Supprimer mon compte |

---

## 16. Data Model — Schéma Prisma cible

Le schéma actuel est une bonne base. Modifications pour la refonte :

### Renommages

- `List` → `Collection`, `ListItem` → `CollectionItem`, table `lists` → `collections`, `list_items` → `collection_items`
- Champ `Item.condition` : valeurs alignées sur `"Mint" | "NM" | "EX" | "VG+" | "VG" | "G"`

### Ajouts

```prisma
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
}

// Mise à jour de NotificationType
enum NotificationType {
  NEW_FOLLOWER
  NEW_SHELF_ADD       // nouveau type
  ACTIVITY_LIKE
  ACTIVITY_COMMENT
}
```

### Ajout sur User

```prisma
// Sur le modèle User
pinnedCollections  Collection[]  @relation("PinnedCollections")
pushTokens         PushToken[]
```

### Ajout sur Collection (ex-List)

```prisma
isPinned    Boolean  @default(false)
pinnedBy    User[]   @relation("PinnedCollections")
```

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
- **XSS** — les champs utilisateur (notes, bio, descriptions) sont sanitisés côté serveur avant persistance
- **Rate limiting** — routes sensibles limitées : follow/unfollow, create item, search, add want
- **Compte privé** — enforcement côté serveur sur toutes les routes de lecture (profil, shelf, feed)
- **Suppression de compte** — purge complète en cascade : items, wants, collections, activités, follows, notifications, push tokens
- **Push tokens** — liés à l'utilisateur, supprimés à la déconnexion et à la suppression de compte
- **Pas de données sensibles côté client**
- **Profils privés** — `noindex` via meta tag + header HTTP `X-Robots-Tag`

---

## 21. Capacitor — Stratégie mobile

- Shell natif Capacitor wrappant l'app Astro (web-first)
- Plugins : `@capacitor/push-notifications` + `@capacitor/camera`
- Fallback web pour le scanner (`BarcodeScanner.client.ts` conservé)
- Build iOS + Android via CI

---

## 22. Pages et routes

### Pages Astro

| Route | Description |
|-------|-------------|
| `/` | Redirect → `/feed` si connecté, landing si non connecté |
| `/feed` | Feed d'activité |
| `/shelf` | Collection personnelle |
| `/explore` | Explore + search |
| `/explorer/[discogsId]` | Détail release Discogs |
| `/profile` | Profil de l'utilisateur connecté |
| `/u/[username]` | Profil public d'un autre utilisateur |
| `/items/[id]` | Détail d'un item de la shelf |
| `/collections` | Liste des collections de l'utilisateur |
| `/collections/[slug]` | Détail d'une collection |
| `/collections/new` | Création d'une collection |
| `/notifications` | Centre de notifications |
| `/settings` | Settings |
| `/login` | Connexion |
| `/signup` | Inscription |
| `/forgot-password` | Mot de passe oublié |
| `/reset-password` | Réinitialisation mot de passe |

### Routes API clés (nouvelles ou modifiées)

| Route | Description |
|-------|-------------|
| `GET /api/feed` | Feed paginé (cursor-based) |
| `POST /api/users/[username]/follow` | Follow / unfollow |
| `GET /api/notifications` | Liste des notifications |
| `PATCH /api/notifications/read` | Marquer comme lues |
| `POST /api/push-tokens` | Enregistrer un token push |
| `DELETE /api/push-tokens/[token]` | Supprimer un token push |
| `GET /api/explore/trending` | Albums tendances |
| `GET /api/explore/new-members` | Nouveaux membres actifs |
| `POST /api/activities/[id]/like` | Like / unlike une activité |
| `POST /api/activities/[id]/comment` | Commenter une activité |
| `GET /api/profile/export` | Export RGPD |

---

## 23. Features supprimées

| Feature | Raison |
|---------|--------|
| Bulk actions | Complexité UX, peu utilisé |
| Pages `/vinyl`, `/cd`, `/cassette` | Remplacées par `/shelf?format=X` |
| Favoris séparés | Fusionnés dans Wants |
| Wishlist séparée | Fusionnée dans Wants |
| Stats complexes | Remplacées par 4–5 chiffres clés sur le profil |
| Boutons rapides sur cards | Remplacés par tap overlay |

---

## 24. Hors scope (v1)

- Tendances hebdo par notification push (job schedulé)
- Back-office / curation éditoriale de l'Explore
- Granularité de confidentialité par item
- Haptics / status bar natifs Capacitor
- Recommandations algorithmiques
