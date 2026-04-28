# Components — Module Guide

## Architecture rules (from CLAUDE.md root)
- Zero emoji anywhere — Lucide icons only (`@lucide/astro/icons/[name]`)
- No HTML in client scripts — use `textContent`, `classList`, `setAttribute`
- No inline SVG — encapsulate in `src/components/ui/` if needed
- Always `aria-hidden="true"` on decorative icons

## Directory structure

### `layouts/`
Full-page layout wrappers. Every page uses one of these.
- `Layout.astro` — base layout: head, fonts, theme, ClientRouter, BottomBar, Footer
- `DashboardLayout.astro` — authenticated pages: wraps Layout + AppHeader + Sidebar

### `ui/` — reusable primitives
| Component | Usage |
|---|---|
| `Avatar.astro` | User avatar with fallback initial. Always use this, never `<img>` directly for users |
| `OptimizedImage.astro` | Images with lazy loading + fallback |
| `Sidebar.astro` | Desktop nav (lg+). Rendered by DashboardLayout |
| `BottomBar.astro` | Mobile nav (hidden on lg+). Rendered by Layout |
| `AppHeader.astro` | Top bar on authenticated pages |
| `Header.astro` | Public pages header |
| `Footer.astro` | Public pages footer |
| `Toast.astro` + `Toast.client.ts` | Toast notifications. Pre-rendered HTML, JS shows/hides |
| `ConfirmDialog.astro` + `ConfirmDialog.client.ts` | Native `<dialog>` confirm modal |
| `EmptyState.astro` | Empty list states |
| `ErrorMessage.astro` | Inline error display |
| `Pagination.astro` | Page-based pagination links |
| `Skeleton.astro` | Loading skeleton |
| `Spinner.astro` | Inline loading spinner |
| `BarcodeScanner.astro` + `BarcodeScanner.client.ts` | Camera barcode scanning (Capacitor Camera plugin) |
| `KeyboardShortcuts.astro` + `KeyboardShortcuts.client.ts` | Keyboard shortcut modal |
| `LanguageSwitcher.astro` + `LanguageSwitcher.client.ts` | Locale switcher (3 variants: settings, sidebar, navbar) |
| `ThemeSwitcher.astro` + `ThemeSwitcher.client.ts` | Dark/light toggle |
| `Logo.astro` | Resonance wordmark |
| `flags/FlagLocale.astro` | Flag SVG for locale. ClipPath IDs are unique per locale+size: `clip-flag-${locale}-${size}` |
| `GoogleLogo.astro` / `DiscordLogo.astro` / `SpotifyLogo.astro` | Third-party logos (acceptable SVG inline for brand logos not in Lucide) |

### `explorer/`
Discogs search and discovery components.
- `SearchBar.astro` + `SearchBar.client.ts` — search input + live results
- `SearchResultCard.astro` + `SearchResultCard.client.ts` — individual search result
- `SearchResultsGrid.astro` — results grid layout
- `ResultCard.astro` — compact result card
- `RecommendationGrid.astro` — homepage recommendations
- `FormatFilter.astro` — format filter (Vinyl/CD/Cassette)
- `AddToCollectionModal.astro` + `AddToCollectionModal.client.ts` — add to collection dialog

## Client script rules
Files named `*.client.ts` are loaded via `import './Foo.client'` inside a `<script>` tag
in the corresponding `.astro` file. They NEVER generate HTML — only manipulate classes,
attributes, and text content on pre-rendered server HTML.
