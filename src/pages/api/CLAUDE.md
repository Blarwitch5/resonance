# API Routes — Module Guide

All routes are Astro API endpoints. Auth check pattern:
```ts
const currentUser = locals.user
if (!currentUser) return 401
```

Ownership is always enforced in the repository layer (userId param), not just here.

## Auth routes (`/api/auth/`)
| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/auth/[...all]` | ALL | — | Better Auth handler (login, register, session) |
| `/api/auth/sign-in` | POST | — | Email/password sign-in |
| `/api/auth/forgot-password` | POST | — | Sends reset email |
| `/api/auth/reset-password` | POST | — | Validates token, updates password |
| `/api/auth/oauth/[provider]` | GET | — | Initiate OAuth (github, google, spotify, discord) |
| `/api/auth/oauth/[provider]/callback` | GET | — | OAuth callback |
| `/api/auth/oauth/create-session` | POST | — | Create session after OAuth |
| `/api/auth/oauth/finalize-session` | POST | — | Finalize OAuth session |

## Shelf items (`/api/shelf-items/`)
| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/shelf-items/create` | POST | ✓ | Body: discogsId, condition, format, rating?, note?, acquiredAt? |
| `/api/shelf-items/[id]/update` | PUT | ✓ | Body: condition?, note?, rating?, acquiredAt? |
| `/api/shelf-items/[id]/delete` | DELETE | ✓ | Ownership enforced in repo |

## Collections (`/api/collections/`)
| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/collections/create` | POST | ✓ | Body: name, description?, isPublic? |
| `/api/collections/[id]/update` | PUT | ✓ | Body: name?, description?, isPublic? |
| `/api/collections/[id]/delete` | DELETE | ✓ | Ownership enforced |
| `/api/collections/[id]/items/add` | POST | ✓ | Body: shelfItemId — upsert, idempotent |
| `/api/collections/[id]/pin` | POST | ✓ | Toggle pin state |

## Activities (`/api/activities/`)
| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/activities/[id]/like` | POST | ✓ | Toggle like |
| `/api/activities/[id]/comment` | POST | ✓ | Body: text (max 280 chars, stripHtml) |
| `/api/activities/[id]/comment` | DELETE | ✓ | ?commentId= query param |

## Feed & Explore
| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/feed` | GET | ✓ | ?cursor= for pagination |
| `/api/explore/trending` | GET | — | Public |
| `/api/explore/new-members` | GET | — | Public |

## Users & Social
| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/users/search` | GET | — | ?q= by name/username |
| `/api/users/[username]/follow` | POST | ✓ | Toggle follow |
| `/api/users/[username]/block` | POST | ✓ | Toggle block |

## Wants
| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/wants/create` | POST | ✓ | Body: releaseId, priority? |
| `/api/wants/[id]/delete` | DELETE | ✓ | Ownership enforced |

## Notifications
| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/notifications` | GET | ✓ | ?cursor= for pagination |
| `/api/notifications/read` | POST | ✓ | Body: id? (all if omitted) |

## Discogs (proxied)
| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/discogs/search` | GET | — | Rate-limited, cached 5min |
| `/api/discogs/search-by-barcode` | GET | — | Rate-limited |
| `/api/discogs/release/[id]` | GET | — | Single release lookup |
| `/api/discogs/render-search-results` | GET | — | SSR-rendered search result HTML |

## Deezer
| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/deezer/search-track` | GET | ✓ | ?artist=&track= → 30s preview URL |

## Profile
| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/profile/update` | PUT | ✓ | Avatar, bio, links |
| `/api/profile/update-name` | POST | ✓ | Body: name |
| `/api/profile/upload-avatar` | POST | ✓ | multipart/form-data |
| `/api/profile/check-username` | GET | — | ?q= — rate-limited |
| `/api/profile/privacy` | POST | ✓ | Body: isPrivate |
| `/api/profile/preferences` | POST | ✓ | Body: theme, locale |
| `/api/profile/locale` | POST | ✓ | Body: locale |
| `/api/profile/notification-prefs` | POST | ✓ | Body: notification preferences |
| `/api/profile/export` | GET | ✓ | JSON export of user data |
| `/api/profile/delete-account` | DELETE | ✓ | Irreversible |

## Push tokens
| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/push-tokens` | POST | ✓ | Register device token |
| `/api/push-tokens/[token]` | DELETE | ✓ | Unregister |

## Releases
| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/releases/[discogsId]` | GET | — | Fetch/backfill release from Discogs |

## Onboarding
| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/onboarding/complete` | POST | ✓ | Set username, finalize profile |

## Sanitization
User-supplied free text (notes, comments, descriptions) is sanitized with `stripHtml()`
from `src/lib/sanitize.ts` before persistence. Never use raw regex for this.
