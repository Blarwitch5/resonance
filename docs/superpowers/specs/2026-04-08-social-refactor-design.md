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

## 14. Features supprimées

| Feature | Raison |
|---------|--------|
| Bulk actions | Complexité UX, peu utilisé |
| Pages `/vinyl`, `/cd`, `/cassette` | Remplacées par `/shelf?format=X` |
| Favoris séparés | Fusionnés dans Wants |
| Wishlist séparée | Fusionnée dans Wants |
| Stats complexes | Remplacées par 4 chiffres clés sur le profil |
| Boutons rapides sur cards | Remplacés par tap overlay |

---

## 15. Hors scope (v1)

- Commentaires sur les activités
- Likes sur les activités
- Recommandations algorithmiques
- Granularité de confidentialité par item
- Haptics / status bar natifs Capacitor
- Export RGPD (à prévoir, pas à implémenter en v1)
