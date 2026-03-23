# Resonance

> **Where your music resonates.**

Resonance is a modern **Progressive Web App (PWA)** that transforms music collection management into a sensory and emotional experience. Create your modern sound journal with an elegant, tactile, and immersive interface for your vinyls, CDs, and cassettes. **Mobile-first** design optimized for iOS and Android (App Store ready), with desktop support for browsing and management.

![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Astro](https://img.shields.io/badge/Astro-5.14.5-FF5D01.svg)

---

## Table of Contents

- [Core Concept](#core-concept--resonance)
- [Visual & Emotional Universe](#visual--emotional-universe)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Architecture](#architecture)
- [Vision](#medium-term-vision)
- [Differentiation](#differentiation)

---

## Core Concept — "Resonance"

**Vision:** Create the modern sound journal for music lovers: an elegant, tactile, and emotional experience where every musical object has its resonance. Not a database. A sensory space.

Resonance doesn't just catalog your records — it makes your musical memories vibrate. Each vinyl, CD, or cassette becomes a bridge to your past experiences, with an interface that celebrates the emotional connection to music.

---

## Visual & Emotional Universe

### Color Palette

Resonance uses a modern OKLCH palette inspired by hi-fi aesthetics: understated, luminous, and immersive. The palette is designed for optimal accessibility (WCAG 2.1 AA) and provides complete interactive states for a polished user experience.

#### Format Colors (Core Identity)

| Format       | Color Name      | OKLCH Value            | Emotion & Usage                   |
| ------------ | --------------- | ---------------------- | --------------------------------- |
| **Vinyl**    | Electric Violet | `oklch(0.55 0.25 280)` | Modern, electric, hi-fi aesthetic |
| **Cassette** | Warm Copper     | `oklch(0.65 0.15 45)`  | Warm, nostalgic, tactile          |
| **CD**       | Cool Blue       | `oklch(0.60 0.18 240)` | Cool, digital, modern             |

#### Light Mode

**Base Colors:**
| Color | OKLCH Value | Usage |
| ------------------ | ------------------------ | ------------------------------ |
| **Background** | `oklch(0.98 0.005 280)` | Main background |
| **Surface** | `oklch(0.95 0.01 280)` | Cards, panels |
| **Surface Elevated** | `oklch(0.97 0.01 280)` | Modals, dropdowns |
| **Surface Pressed** | `oklch(0.93 0.01 280)` | Pressed buttons |

**Text Colors:**
| Color | OKLCH Value | Usage |
| ---------------- | ---------------------- | ------------------------ |
| **Text Primary** | `oklch(0.08 0.01 280)` | Main text |
| **Text Secondary** | `oklch(0.40 0.02 280)` | Secondary text (improved contrast) |
| **Text Tertiary** | `oklch(0.50 0.02 280)` | Placeholders, hints |
| **Text Disabled** | `oklch(0.65 0.01 280)` | Disabled text |

**Primary Colors (Vinyl - Electric Violet):**
| Color | OKLCH Value | Usage |
| ---------------- | ---------------------- | ------------------------ |
| **Primary** | `oklch(0.55 0.25 280)` | Primary actions, vinyl |
| **Primary Hover** | `oklch(0.50 0.25 280)` | Hover state |
| **Primary Active** | `oklch(0.45 0.25 280)` | Active/pressed state |
| **Primary Light** | `oklch(0.85 0.10 280)` | Light background variant |

**Secondary Colors (Cassette - Warm Copper):**
| Color | OKLCH Value | Usage |
| ------------------ | --------------------- | ------------------------ |
| **Secondary** | `oklch(0.65 0.15 45)` | Secondary actions, cassette |
| **Secondary Hover** | `oklch(0.60 0.15 45)` | Hover state |
| **Secondary Active** | `oklch(0.55 0.15 45)` | Active state |
| **Secondary Light** | `oklch(0.90 0.08 45)` | Light background variant |

**Accent Colors:**
| Color | OKLCH Value | Usage |
| -------------- | --------------------- | ------------------------ |
| **Accent** | `oklch(0.6 0.2 280)` | Secondary accent |
| **Accent Hover** | `oklch(0.55 0.2 280)` | Hover state |
| **CD Color** | `oklch(0.60 0.18 240)` | CD collection, digital elements |

**Semantic Colors:**
| Color | OKLCH Value | Usage |
| ---------------- | ---------------------- | ------------------------ |
| **Success** | `oklch(0.5 0.15 140)` | Success messages |
| **Success Light** | `oklch(0.90 0.08 140)` | Success backgrounds |
| **Warning** | `oklch(0.6 0.15 80)` | Warnings, cautions |
| **Warning Light** | `oklch(0.92 0.08 80)` | Warning backgrounds |
| **Error** | `oklch(0.5 0.2 20)` | Errors, destructive |
| **Error Light** | `oklch(0.95 0.10 20)` | Error backgrounds |
| **Info** | `oklch(0.55 0.15 220)` | Informational messages |
| **Info Light** | `oklch(0.90 0.08 220)` | Info backgrounds |

**Borders & Dividers:**
| Color | OKLCH Value | Usage |
| ---------------- | ---------------------- | ------------------------ |
| **Border** | `oklch(0.9 0.01 280)` | Default borders |
| **Border Subtle** | `oklch(0.92 0.01 280)` | Subtle dividers |
| **Border Strong** | `oklch(0.85 0.01 280)` | Strong borders, focus |

**Overlays:**
| Color | OKLCH Value | Usage |
| ---------------- | ------------------------------ | ------------------------ |
| **Overlay** | `oklch(0.08 0.01 280 / 0.5)` | Modal backdrops |
| **Overlay Light** | `oklch(0.08 0.01 280 / 0.2)` | Subtle overlays |

#### Dark Mode

**Base Colors:**
| Color | OKLCH Value | Usage |
| ------------------ | ----------------------- | ------------------------ |
| **Background** | `oklch(0.08 0.01 280)` | Dark main background |
| **Surface** | `oklch(0.12 0.02 280)` | Cards, panels |
| **Surface Elevated** | `oklch(0.16 0.02 280)` | Modals, dropdowns |
| **Surface Pressed** | `oklch(0.20 0.02 280)` | Pressed buttons |

**Text Colors:**
| Color | OKLCH Value | Usage |
| ---------------- | ---------------------- | ------------------------ |
| **Text Primary** | `oklch(0.95 0.01 280)` | Light main text |
| **Text Secondary** | `oklch(0.70 0.02 280)` | Secondary text |
| **Text Tertiary** | `oklch(0.60 0.02 280)` | Placeholders, hints |
| **Text Disabled** | `oklch(0.45 0.01 280)` | Disabled text |

**Primary Colors (Vinyl - Electric Violet):**
| Color | OKLCH Value | Usage |
| ---------------- | ---------------------- | ------------------------ |
| **Primary** | `oklch(0.55 0.25 280)` | Primary actions, vinyl |
| **Primary Hover** | `oklch(0.60 0.25 280)` | Hover state (lighter) |
| **Primary Active** | `oklch(0.50 0.25 280)` | Active/pressed state |
| **Primary Light** | `oklch(0.70 0.15 280)` | Light variant |

**Secondary Colors (Cassette - Warm Copper):**
| Color | OKLCH Value | Usage |
| ------------------ | --------------------- | ------------------------ |
| **Secondary** | `oklch(0.65 0.15 45)` | Secondary actions, cassette |
| **Secondary Hover** | `oklch(0.70 0.15 45)` | Hover state |
| **Secondary Active** | `oklch(0.60 0.15 45)` | Active state |
| **Secondary Light** | `oklch(0.75 0.12 45)` | Light variant |

**Accent Colors:**
| Color | OKLCH Value | Usage |
| -------------- | --------------------- | ------------------------ |
| **Accent** | `oklch(0.6 0.2 280)` | Secondary accent |
| **Accent Hover** | `oklch(0.65 0.2 280)` | Hover state |
| **CD Color** | `oklch(0.65 0.18 240)` | CD collection, digital elements |

**Semantic Colors:**
| Color | OKLCH Value | Usage |
| ---------------- | ---------------------- | ------------------------ |
| **Success** | `oklch(0.7 0.15 140)` | Success messages |
| **Success Light** | `oklch(0.25 0.08 140)` | Success backgrounds |
| **Warning** | `oklch(0.8 0.15 80)` | Warnings |
| **Warning Light** | `oklch(0.25 0.08 80)` | Warning backgrounds |
| **Error** | `oklch(0.65 0.2 20)` | Errors |
| **Error Light** | `oklch(0.25 0.10 20)` | Error backgrounds |
| **Info** | `oklch(0.70 0.15 220)` | Informational |
| **Info Light** | `oklch(0.25 0.08 220)` | Info backgrounds |

**Borders & Dividers:**
| Color | OKLCH Value | Usage |
| ---------------- | ---------------------- | ------------------------ |
| **Border** | `oklch(0.2 0.02 280)` | Default borders |
| **Border Subtle** | `oklch(0.18 0.02 280)` | Subtle dividers |
| **Border Strong** | `oklch(0.25 0.02 280)` | Strong borders, focus |

**Overlays:**
| Color | OKLCH Value | Usage |
| ---------------- | ------------------------------ | ------------------------ |
| **Overlay** | `oklch(0.08 0.01 280 / 0.7)` | Modal backdrops |
| **Overlay Light** | `oklch(0.08 0.01 280 / 0.4)` | Subtle overlays |

**Adaptive Theme:** Automatic switching between light and dark modes based on system preferences via `data-theme`.

### Typography

Resonance uses two fonts optimized for performance and readability:

- **Poppins** — Main font for all textual content
  - Available weights: Regular (400), Medium (500), SemiBold (600), Bold (700)
  - Elegant and geometric characters, highly readable
  - Optimized loading with `font-display: swap` for better performance
- **JetBrains Mono** — Monospace font for code and technical data
  - Available weights: Regular (400), Medium (500), Bold (700)
  - Perfect for displaying technical information, codes, and structured data

Fonts are loaded from `/fonts/` in WOFF2 format for fast and optimized loading. The strong contrast between different Poppins weights reinforces the resonance concept and creates a clear visual hierarchy.

### Motion & Micro-interactions

Animations embody the vibration and life of music:

- **Adding a record** → wave that propagates in the background
- **Hover or slide** → slight vibrato of icons
- **Loading animation** → concentric waves moving away from the center
- **Profile page** → subtle pulse around the avatar, linked to the number of active formats

These details create a sensory experience without distracting from the essentials.

---

## Features

### Main Features

#### Multi-format Collections

Resonance supports multiple formats with **Vinyl as the primary focus**, while allowing users to manage their complete physical media collection:

- **Unified Collection View** — Single collection with smart format selector
- **Format Selector** — Chips/pills at top: [All] [Vinyl] [Cassette] [CD]
- **Smart Format Display** — Only shows formats you collect (hide unused formats in settings)
- **Vinyl-First Design** — Vinyl is primary, others are secondary but fully supported
- **Complete Details** — Full metadata, cover art, and personal context for each item
- **Format-Specific Features** — Each format has its unique characteristics and metadata

**Why Multi-Format?**

- Many collectors have mixed collections (vinyl + some cassettes/CDs)
- Broader market appeal while maintaining vinyl focus
- Flexible: users can disable formats they don't collect
- Future-proof: easy to add more formats (reel-to-reel, 8-track, etc.)

#### Explorer

- **Search** — Advanced search in the Discogs database and your collection
- **Barcode Scanner** — Quick add by scanning barcode (mobile camera)
- **Filters** — By format (Vinyl, Cassette, CD), genre, year, label, condition
- **Discoveries** — Personalized suggestions based on your collection
- **Quick Add** — Fast workflow to add records to your collection

#### Profile

The profile section is organized with a clean tabbed interface to avoid overload:

**Profile Header:**

- **Customizable avatar and bio** — Personalize your profile

**Profile Tabs:**

- **Favorites** `Heart` — Quick access to your most loved albums
- **Wishlist** `ShoppingCart` — Track albums you want to acquire
- **Statistics** `BarChart3` — Visual insights about your collection (see below)
- **All Formats** — Unified view of all formats (Vinyl, Cassette, CD)

**Settings** (accessible via gear icon, opens bottom sheet/modal):

- **Active Formats** — Enable/disable Vinyl, Cassette, CD (hide formats you don't collect)
- **Theme Preferences** — Light/dark/auto (follows system)
- **Language** — App language selection
- **Advanced Options** — Market value estimation (disabled by default, can be enabled)
- **View Preferences** — List/grid toggle, default format selection

**Account** (in settings or separate section):

- Plan management
- Help and support
- Account settings

**Statistics - Visual Insights:**
Statistics focus on meaningful, visual metrics that tell the story of your collection:

**Core Identity (Visual Cards):**

- **Total Albums** — Your complete collection count
- **Artists / Albums / Labels** — Shows diversity: "X Artists • Y Albums • Z Labels"
- **Format Breakdown** — Visual pie chart (Vinyl, Cassette, CD distribution)
- **Genre Breakdown** — Visual bar chart showing your musical taste
- **Decades Timeline** — Visual timeline showing your collection span across eras

**Personal Highlights (Storytelling):**

- **Most Present Artist** — Your favorite artist (most albums in collection)
- **Dominant Label** — Label you collect most from
- **Oldest / Newest Record** — Your collection span (oldest and most recent finds)
- **Collection Timeline** — See when you added albums over time (visual graph)

**Engagement:**

- **Wishlist Count** — Albums you want to acquire

**Optional Stats (If Features Enabled):**

- **Value Stats** — All value-related metrics (if value estimation enabled in settings)
- **Fun Facts** — Total duration, rarest pressing, country breakdown (advanced view)

**Deferred Features (Future):**

- **Listening Stats** — Most listened, last listened, genre comparison (listening tracking feature deferred)
- **Completion Goals** — Progress toward collection goals (goals feature deferred)
- **Artist Completion %** — % of discography owned (discography data feature deferred)

All statistics are presented visually with charts, graphs, and visual cards—not just numbers. Each stat tells a story about your collection and musical journey.

#### Collection Management

**Core Features:**

- **Discogs Import** — Import your entire collection with complete metadata
- **Album Details** — Beautiful full-screen detail view with cover art, metadata, and personal context
- **Personal Notes** — Add memories, stories, and personal context to each album
- **Condition & Purchase Tracking** — Track condition and where you bought each record
- **Collection Search** — Find albums quickly with search across your collection
- **Smart Filters** — Filter by format, genre, year, label, condition, artist
- **Sort & Organize** — Sort by artist, year, recently added, or custom order
- **Collection Sharing** — Share your public collection with friends
- **Import/Export** — Backup and restore your collection

**Quick Actions (Mobile):**

- **Floating Action Button** — Quick "Add Record" button always accessible
- **Swipe to Favorite** — Swipe right on album to add to favorites
- **Long-press Menu** — Context menu for quick actions (edit, delete, share)
- **Swipe Gestures** — Swipe left to edit/delete, swipe right for details

**Advanced Options** (optional, can be enabled in settings):

- **Market Value Estimation** — Optional market value tracking for insurance or collection assessment (disabled by default, can be enabled in settings)

#### Authentication

- Secure system with better-auth (type-safe)
- Automatic session management
- Protection of sensitive routes
- Email/password support
- Automatic authentication endpoints

---

## User Experience

### Mobile-First Design

#### Main Navigation (Bottom Bar)

Mobile navigation uses a **clean 3-tab bottom bar** optimized for thumb reach and visual clarity:

| Icon         | Name           | Description                                  |
| ------------ | -------------- | -------------------------------------------- |
| `Library`    | **Collection** | Unified collection view with format selector |
| `ScanSearch` | **Explorer**   | Discover, search, scan barcode               |
| `User`       | **Profile**    | Favorites, wishlist, stats, settings         |

**Why 3 Tabs?**

- ✅ Optimal for mobile thumb reach
- ✅ Industry standard pattern (Instagram, Spotify)
- ✅ Scalable (works with 1 format or many)
- ✅ Clean and uncluttered
- ✅ Format selector is contextual (only in Collection view)

**Mobile Behavior:**

- **Bottom bar** — 3 tabs, easy thumb reach, always accessible
- **Format selector** — Chips/pills at top of Collection view: [All] [Vinyl] [Cassette] [CD]
  - Active format highlighted
  - Hidden formats don't appear (if disabled in settings)
  - Smart: If only 1 format enabled, selector is hidden
- **Swipe gestures** — Swipe left to edit/delete, swipe right for details
- **Quick actions** — Floating action button for "Add Record"
- **Pull to refresh** — Refresh collection data
- **Adaptive theme** — Subtle color shift based on active format

#### Key Mobile Interactions

- **Collection View**
  - List or grid layout (user preference)
  - Search bar at top (pull down to reveal)
  - Filter button opens bottom sheet
  - Swipe gestures for quick actions
  - Infinite scroll or pagination

- **Album Detail View**
  - Full-screen cover art
  - Swipe between albums
  - Quick actions: Favorite, Add to Wishlist, Share
  - Personal notes section
  - Condition and purchase info

- **Profile**
  - Scrollable header with avatar and bio
  - Tabbed interface: Favorites, Wishlist, Statistics, All Formats
  - Settings accessible via gear icon (opens bottom sheet)
  - Statistics with visual charts (3-5 key metrics: total albums, format breakdown, decades, timeline)
  - Clean, uncluttered design

### Platform Strategy

**Primary Platform: Mobile (PWA)**

- Resonance is built as a **Progressive Web App (PWA)** optimized for mobile
- Mobile-first design with native app-like experience
- **App Store Distribution:** Can be packaged for iOS/Android App Stores using wrapper (Capacitor, Tauri, or similar)
- Full offline support and native device features

**Secondary Platform: Desktop**

- Desktop experience optimized for **browsing and management**
- Users primarily use desktop for:
  - Browsing large collections
  - Management tasks (bulk operations, organization)
  - Detailed viewing and editing
- Responsive design adapts mobile-first experience to desktop

### Desktop Experience

While mobile-first, Resonance provides a **fully optimized desktop experience** that takes advantage of larger screens for browsing and management:

#### Desktop Navigation

**Sidebar Navigation** (replaces bottom bar):

```
Sidebar Structure:
├── Collection
│   ├── All Formats
│   ├── Vinyl
│   ├── Cassette
│   └── CD
├── Explorer
└── Profile
    ├── Favorites
    ├── Wishlist
    ├── Statistics
    └── Settings
```

**Key Features:**

- **Expanded sidebar** — More space for organized navigation
- **Format submenu** — Easy access to format-specific views
- **Profile submenu** — All profile sections accessible
- **Keyboard shortcuts** — Power user features:
  - `⌘K` — Quick search
  - `⌘F` — Open filters
  - `⌘N` — Add new record
  - `Arrow keys` — Navigate collection
  - `Esc` — Close modals/details

#### Desktop Layout

**Default View: Grid Layout**

- Beautiful grid of album covers (larger than mobile)
- Hover effects reveal quick actions
- Click to open detail view
- Responsive grid (adjusts to screen size)

**Split View Option** (power user feature):

- List on left (compact, scrollable)
- Detail on right (full album information)
- Click list item to update detail view
- Keyboard navigation between items

**Album Detail View:**

- Multi-column layout (cover art, metadata, notes side-by-side)
- Larger cover art showcase
- More information visible at once
- Better use of horizontal space

#### Desktop Features

**Bulk Operations:**

- **Multi-select** — Select multiple albums with checkboxes
- **Batch actions** — Edit, delete, or tag multiple albums
- **Drag & drop** — Organize collections by dragging
- **Keyboard selection** — `⌘A` to select all, `Shift+Click` for range

**Advanced Filtering:**

- **Persistent filter bar** — Always visible (vs mobile bottom sheet)
- **Multiple filters** — Apply multiple filters simultaneously
- **Filter presets** — Save common filter combinations
- **Advanced search** — More search options visible

**Power User Features:**

- **Keyboard navigation** — Full keyboard support for all actions
- **Context menus** — Right-click for quick actions
- **Keyboard shortcuts** — All major actions have shortcuts
- **Multi-window** — Open multiple views (if needed)

#### Responsive Breakpoints

**Mobile (Primary - PWA):** < 768px

- **PWA optimized** — Native app-like experience
- Bottom bar (3 tabs: Collection, Explorer, Profile)
- Format selector chips in Collection view
- List view default (grid toggle available)
- Swipe gestures enabled
- Floating action button for "Add Record"
- **App Store Ready** — Can be packaged for iOS/Android via wrapper (Capacitor, Tauri, etc.)

**Tablet:** 768px - 1024px

- Centered bottom bar (limited width)
- Grid/list view toggle
- Format selector visible
- Touch-optimized interactions
- PWA features enabled

**Desktop (Secondary - Browsing & Management):** > 1024px

- **Optimized for browsing and management workflows**
- Sidebar navigation (replaces bottom bar)
- Grid view default (better for browsing large collections)
- Split view option available
- Format submenu in sidebar
- Keyboard shortcuts enabled
- Multi-select and bulk operations (management tasks)
- Advanced filtering visible
- **Use Cases:** Browsing collection, detailed viewing, bulk management

### Additional User Experience Features

#### Empty States & Onboarding

- **Beautiful Empty States** — Inspiring empty states for new users
- **Onboarding Flow** — Guided tour for first-time users
- **"Add Your First Record" CTA** — Clear call-to-action to get started
- **Helpful Tips** — Contextual tips and guidance

#### Offline Support

- **Collection Caching** — Cache collection data for offline access
- **Offline Mode** — Browse and view your collection without internet
- **Sync When Online** — Automatic sync when connection is restored
- **Optimized for Slow Connections** — Works well even on poor mobile networks

#### Performance Optimizations

- **Lazy Loading** — Images load as you scroll for faster initial load
- **Infinite Scroll** — Smooth pagination for large collections
- **Optimized Images** — WebP format with proper sizing and lazy loading
- **Fast Search** — Instant search results as you type
- **Progressive Loading** — Critical content loads first, secondary content after

---

## Installation

### Prerequisites

- **Node.js** 22.12.0+ (required by Astro 6)
- **pnpm** 10.11.0+ (or npm/yarn)
- **PostgreSQL** (Neon)
- **Discogs API Keys** ([get them here](https://www.discogs.com/settings/developers))
- **better-auth** (integrated authentication)

### Installation Steps

1. **Clone the repository**

```bash
git clone https://github.com/blarwitch5/resonance.git
cd resonance/app
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Configure environment variables**

```bash
cp env.example .env
```

Edit `.env` with your keys:

```env
# Discogs API Keys
DISCOGS_CONSUMER_KEY="your_discogs_consumer_key_here"
DISCOGS_CONSUMER_SECRET="your_discogs_consumer_secret_here"

# PostgreSQL Database
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# better-auth (required for authentication)
BETTER_AUTH_SECRET="your-secret-key-here-minimum-32-characters"
BETTER_AUTH_URL="http://localhost:4322"

# Configuration
NODE_ENV="development"
PORT="4322"
```

4. **Initialize the database**

```bash
pnpm prisma migrate dev
pnpm prisma generate
```

5. **Start the development server**

```bash
pnpm dev
```

The application will be accessible at `http://localhost:4322`

---

## Configuration

### Environment Variables

Toutes les variables sont lues depuis **`app/.env`** uniquement. Aucun fichier `.env` à la racine du monorepo pour l’app. Copier `app/env.example` vers `app/.env` puis renseigner les valeurs. En dev, lancer depuis `app/` (`pnpm dev`) pour que Vite charge ce fichier.

| Variable                  | Description                            | Required           |
| ------------------------- | -------------------------------------- | ------------------ |
| `DISCOGS_CONSUMER_KEY`    | Discogs API key                        | ✅                 |
| `DISCOGS_CONSUMER_SECRET` | Discogs API secret                     | ✅                 |
| `DATABASE_URL`            | PostgreSQL URL                         | ✅                 |
| `BETTER_AUTH_SECRET`      | better-auth secret (min 32 characters) | ✅                 |
| `BETTER_AUTH_URL`         | Application base URL                   | ✅                 |
| `NODE_ENV`                | Environment (development/production)   | ⚠️                 |
| `PORT`                    | Server port                            | ⚠️ (default: 4322) |

### Prisma Configuration

The Prisma schema defines data models. After modification, run:

```bash
pnpm prisma migrate dev
pnpm prisma generate
```

---

## Development

### Available Commands

```bash
# Development
pnpm dev              # Start development server

# Build
pnpm build            # Production build
pnpm preview          # Preview the build

# Formatting
pnpm format           # Format code with Prettier
pnpm format:check     # Check formatting

# Utility scripts
pnpm covers:update    # Update high-quality covers
pnpm covers:clean     # Clean covers
```

### Project Structure

```
app/
├── src/
│   ├── components/        # Reusable Astro components
│   │   ├── layouts/      # Page layouts
│   │   └── ui/           # UI components (Header, Footer, BottomBar, etc.)
│   ├── lib/              # Utilities and helpers
│   ├── pages/            # Astro pages (automatic routing)
│   ├── scripts/          # Utility scripts
│   └── styles/           # Global styles and theme
├── prisma/               # Prisma schema and migrations
├── public/               # Static assets
└── .cursor/              # Cursor AI rules
```

### Code Standards

The project follows the rules defined in `.cursor/rules/`:

- **TypeScript strict** — Explicit types, no `any`
- **Pure Astro** — Server components by default
- **Tailwind CSS** — Utility-first, mobile-first
- **Accessibility** — WCAG 2.1 AA minimum
- **Performance** — Web Vitals optimization
- **Design Patterns** — Factory, Repository, Adapter, Observer

See [`.cursor/rules/`](./.cursor/rules/) for more details.

---

## Architecture

### Design Patterns

Resonance uses a modular architecture based on several design patterns:

#### Factory Pattern

Manages multiple types of "Vinyl" objects (collection, wishlist, custom...).

#### Repository Pattern

Abstracts data access with Prisma for clear separation of concerns.

#### Adapter Pattern

Unifies data formats (Discogs API, local formats) into a consistent internal format.

#### Observer Pattern

Reacts to real-time changes (UI updates, notifications, etc.).

See [`.cursor/rules/105-design-patterns.mdc`](./.cursor/rules/105-design-patterns.mdc) for implementation details.

### Technologies

- **Astro** (latest) — Modern web framework with SSR
- **TypeScript** — Static typing
- **Tailwind CSS** (latest) — Utility CSS framework with OKLCH
- **Prisma** (latest) — ORM for database
- **SQLite** — Database (MVP) → PostgreSQL (production if needed)
- **better-auth** (latest) — Type-safe and modern authentication
- **Discogs API** — Integration for musical metadata
- **@lucide/astro** — Modern SVG icons library used throughout the app for all iconography
- **Chart.js** — Statistics visualization (for future statistics features)
- **Sharp** — High-performance image optimization and processing
- **PWA** — Progressive Web App (mobile-first, App Store ready)
- **App Store Distribution** — Deferred to Phase 2 (Capacitor wrapper)

---

## Logo / Identity

### Typographic Logo

**Resonance** — Thin letters, with slight spacing (breathing kerning). The "O" can be stylized as a sound wave (circle with rings).

### Standalone Symbol (app icon)

Concentric circle with 3 subtle waves, monochrome. → Minimal, readable, evokes sound and soul.

### Emotion

"Music still resonates in memory" — The visual identity embodies this emotional resonance.

---

## Tone & Voice

**Tone:** Calm, passionate, respectful of the emotional connection to music. No "tech" tone: rather sensory and poetic.

### Copywriting Examples

- "Add this record to your resonance."
- "3 new albums found in your echo range."
- "Your collection spans 4 decades of sound."
- "Let this music resonate with your memories."

---

## Medium-term Vision

Resonance could become your complete listening and collection ecosystem:

### Future Features

These features are planned for future releases based on user feedback:

- **Cloud sync** — Synchronization between devices
- **Musical stories** — Tell your sound life story with albums
- **Pressing comparison** — Compare different pressings of the same album
- **Spotify integration** — Link albums to Spotify playlists
- **Collaborative collections** — Share and collaborate on collections with friends
- **Smart collections** — Auto-filtered collections (e.g., "Albums from 80s", "Jazz collection")
- **Public API** — Integration with other services and tools

---

## Differentiation

| Axis          | Resonance                              | Discogs                       |
| ------------- | -------------------------------------- | ----------------------------- |
| **Objective** | Emotional collection experience        | Database / marketplace        |
| **Target**    | Sensitive collectors, curators         | Buyers, archivists            |
| **Identity**  | Poetic, immersive, sensory             | Technical, cold, encyclopedic |
| **Interface** | Mobile-first, animated, modern         | Desktop-first, dense          |
| **Value**     | Feel and revisit your musical memories | List and sell objects         |

Resonance is not just a catalog — it's a space where every record resonates with your personal experiences.

---

## Contributing

Contributions are welcome! Please:

1. Fork the project
2. Create a branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Follow the code standards defined in `.cursor/rules/` and use semantic commits.

---

## License

This project is licensed under MIT. See the `LICENSE` file for more details.

---

## Acknowledgments

- **Discogs** — For the API and comprehensive database
- **Astro** — For the performant framework
- **Tailwind CSS** — For the design system
- The music collectors community

---

## Credits

**Made with `Heart` and `Music` for music lovers**

_Where your music resonates._
