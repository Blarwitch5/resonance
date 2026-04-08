# Resonance — Social Refactor Design Spec

**Date:** 2026-04-08
**Status:** Approved
**Scope:** Full refonte de l'app Resonance vers un modèle social-first (inspiré Letterboxd)

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
- **Shelf** — collection personnelle (ancienne library)
- **[+]** — FAB central — ajout rapide (scan / recherche)
- **Explore** — découverte communauté + search global
- **Profile** — profil public de l'utilisateur connecté

---

## 4. Feed

- Rich cards avec cover, artiste, titre, action de l'utilisateur suivi
- Bouton "+ Want" contextuel sur chaque card
- Activités trackées : ajout shelf · Want · nouvelle collection · note/rating
- État vide (aucun follow) : suggestions de profils à suivre + tendances communauté

---

## 5. Shelf (ancienne Library)

- Vue grille par défaut
- Tap sur card → overlay avec 3 actions max (ex. : Éditer · Want · Supprimer)
- Vue liste + swipe disponible dans les settings
- Pas de bulk mode
- Pills de format en haut (Vinyl · CD · Cassette), search, tri
- Pages `/vinyl`, `/cd`, `/cassette` supprimées → tout dans `/shelf?format=X`

---

## 6. Profil public `/u/[username]`

Style Letterboxd :

- Header : avatar, nom, bio courte
- Stats : Records · Collections · Followers · Following · Wants
- Section "Récemment ajoutés" (6 derniers items)
- Collections épinglées
- Bouton "Suivre" pour les autres utilisateurs

---

## 7. Formats

Vinyl · CD · Cassette conservés. Vinyl = format héro.
L'utilisateur choisit ses formats actifs dans les settings (déjà prévu dans le code).

---

## 8. Wants (unifié)

Fusion Favoris + Wishlist en un seul concept **Wants** :

- Priorité optionnelle (haute / normale)
- Accessible depuis le feed, l'explore, et les pages item
- Bouton "+ Want" contextuel partout

---

## 9. Social — Data Model

### Nouvelles tables Prisma

```prisma
model Follow {
  id          String   @id @default(cuid())
  followerId  String
  followingId String
  createdAt   DateTime @default(now())
  follower    User     @relation("Follower", fields: [followerId], references: [id])
  following   User     @relation("Following", fields: [followingId], references: [id])

  @@unique([followerId, followingId])
}

model Activity {
  id         String       @id @default(cuid())
  userId     String
  type       ActivityType
  itemId     String?
  collectionId String?
  rating     Int?
  createdAt  DateTime     @default(now())
  user       User         @relation(fields: [userId], references: [id])
}

enum ActivityType {
  ADDED_TO_SHELF
  ADDED_WANT
  CREATED_COLLECTION
  RATED_ITEM
}
```

### Feed query

Le feed agrège les activités des utilisateurs suivis, triées par `createdAt` DESC, paginées (cursor-based).

---

## 10. Confidentialité

- **Par défaut : public** — profil et shelf visibles par tous (non connectés inclus)
- **Compte privé** — option globale dans les settings. Quand activé : profil et shelf masqués aux non-followers, profil non indexé
- Pas de granularité item par item (hors scope v1)

---

## 11. Accessibilité

Cible : **WCAG 2.1 AA + mobile-first**

- Tap targets minimum 44×44px sur tous les éléments interactifs
- Bottom bar navigable au lecteur d'écran (VoiceOver / TalkBack) avec labels ARIA explicites
- Focus visible sur tous les éléments interactifs (pas de `outline: none` sans alternative)
- Swipe actions avec alternative tap (pas de fonctionnalité exclusive au swipe)
- Contraste minimum AA sur toutes les couleurs de texte
- Images avec alt text (covers : `alt="[Artiste] — [Titre]"`)

---

## 12. Sécurité / RGPD

- `better-auth` conservé — sessions sécurisées, CSRF protection
- Pas de stockage de données sensibles côté client
- Suppression de compte : purge complète (items, activités, follows) — flux à implémenter
- Export de données (RGPD) : endpoint à prévoir
- Profils privés non indexés par les moteurs de recherche (`noindex`)
- Push notifications : opt-in explicite, révocable dans les settings

---

## 13. Capacitor — Stratégie mobile

- Shell natif Capacitor wrappant l'app Astro (web-first)
- Plugins ajoutés :
  - `@capacitor/push-notifications` — notifs follow + activité
  - `@capacitor/camera` — scanner code-barres natif (fallback : implémentation web existante `BarcodeScanner.client.ts`)
- Le reste reste full web (pas de plugins haptics, status bar, etc. en v1)
- Build iOS + Android via CI

---

## 14. Item Detail `/items/[id]`

### Informations publiques (visibles par tous)

- Cover, artiste, titre, label, année, format, pays de pressage
- Tracklist
- Rating personnel de l'utilisateur propriétaire (étoiles 1–5)
- Rating moyen communauté (affiché à partir de 3 ratings minimum)
- Followers qui ont aussi cet album dans leur shelf ("X personnes que tu suis ont ce disque")
- Bouton "+ Want" (si l'item appartient à quelqu'un d'autre)

### Informations personnelles (propriétaire uniquement)

- Note texte libre
- Date d'acquisition
- État de conservation : Mint · VG+ · VG · Good · Poor

### Actions disponibles (propriétaire)

- Éditer les infos personnelles
- Modifier le rating
- Supprimer de la shelf

---

## 15. Flow d'ajout — FAB `[+]`

1. Tap sur `[+]` → bottom sheet avec deux options : **Scanner** / **Rechercher**
2. **Scanner** : ouvre la caméra (natif Capacitor ou fallback web). Scan du code-barres → résultat automatique
3. **Rechercher** : champ texte (artiste / titre / code-barres manuel) → liste de résultats
4. Sélection d'un album → form inline :
   - Format (Vinyl / CD / Cassette) — obligatoire
   - État de conservation — obligatoire
   - Note personnelle — optionnel
5. Confirmation → ajout à la shelf + création d'une activité `ADDED_TO_SHELF`

---

## 16. Explore `/explorer`

- Barre de recherche globale (artiste / titre / label)
- Section **Tendances** — albums les plus ajoutés cette semaine dans la communauté
- Section **Nouveaux membres actifs** — profils récemment rejoints avec activité
- Résultats de recherche paginés avec cover + metadata

---

## 17. Settings

| Section | Contenu |
|---------|---------|
| Compte | Changer email · Changer mot de passe · Connexions OAuth |
| Confidentialité | Compte privé (on/off) |
| Shelf | Formats actifs (Vinyl/CD/Cassette) · Vue par défaut (grille/liste) |
| Notifications | Nouveau follower (on/off) · Ajout shelf suivi (on/off) |
| Données | Export de mes données (RGPD) |
| Danger zone | Supprimer mon compte |

---

## 18. Notifications

Types envoyés en v1 :
- **Nouveau follower** — "X a commencé à te suivre"
- **Ajout shelf** — "X a ajouté [Album] à sa shelf"

Chaque type est activable/désactivable indépendamment dans les settings.
Opt-in explicite au premier lancement (permission push iOS/Android via Capacitor).

---

## 19. Features supprimées

| Feature | Raison |
|---------|--------|
| Bulk actions | Complexité UX, peu utilisé |
| Pages `/vinyl`, `/cd`, `/cassette` | Remplacées par `/shelf?format=X` |
| Favoris séparés | Fusionnés dans Wants |
| Wishlist séparée | Fusionnée dans Wants |
| Stats complexes | Remplacées par 4 chiffres clés sur le profil |
| Boutons rapides sur cards | Remplacés par tap overlay |

---

## 20. Hors scope (v1)

- Commentaires sur les activités
- Likes sur les activités
- Recommandations algorithmiques
- Granularité de confidentialité par item
- Haptics / status bar natifs Capacitor
- Export RGPD (endpoint à prévoir, pas à implémenter en v1)
- Tendances hebdo par notification push
- Back-office / curation éditoriale de l'Explore
- Page collections detail refonte (ajout social léger, traité à l'implémentation)
