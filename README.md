# 🎧 AudioScape

> **A next-generation, cloud-native music streaming web application.**  
> Stream music from YouTube, discover new tracks with AI-powered recommendations, manage playlists, and enjoy a cinematic fullscreen player — all in one elegant interface.

[![Version](https://img.shields.io/badge/Release-v2.0.0--staging-6D28D9?style=for-the-badge)](https://github.com/Anirban780/AudioScape/releases)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite%206-61DAFB?style=for-the-badge&logo=react)](https://vitejs.dev)
[![Backend](https://img.shields.io/badge/Backend-NestJS%2010-E0234E?style=for-the-badge&logo=nestjs)](https://nestjs.com)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20(Neon)-00E599?style=for-the-badge&logo=postgresql)](https://neon.tech)

---

## 📖 Table of Contents

1. [Overview](#-overview)
2. [Tech Stack](#-tech-stack)
3. [Architecture](#-architecture)
4. [Pages & Features](#-pages--features)
5. [Core Systems](#-core-systems)
6. [Database Schema](#-database-schema)
7. [Installation & Setup](#-installation--setup)
8. [Contributing](#-contributing)
9. [License](#-license)
10. [Contact](#-contact)

---

## 🌟 Overview

AudioScape started as a simple YouTube-backed music player and has evolved into a **full-stack, production-grade music streaming platform**. The project has undergone a complete architectural modernization — migrating from Express + Firestore to a **NestJS 10 + PostgreSQL (Neon) + Prisma ORM** backend, while the frontend was rebuilt from scratch using **React 19 + Vite 6 + Tailwind CSS v4** with a custom design system.

### What Makes AudioScape Different

| Feature | Detail |
|---|---|
| 🎵 **YouTube-powered** | Streams any music from YouTube without storing copyrighted media |
| 🤖 **TF-IDF Recommendations** | Content-based AI engine — zero external API cost, 100% database-first |
| 🔍 **3-Tier Search** | Page cache → PostgreSQL FTS → YouTube API (only hits YouTube as last resort) |
| 🔑 **Dual API Key Rotation** | Two YouTube API keys with auto-switching at 8,000 unit threshold — 20K units/day total |
| 🛡️ **Secure by Design** | JWT + HttpOnly refresh cookies, Google OAuth 2.0, server-side key proxying |
| 🌗 **Tri-State Theming** | Light / Dark / System (OS-sync) with reactive media query listener |
| 📺 **Cinematic Player** | FullScreen player as default mode with slow-sliding 2-line track title |
| 📜 **Listening History** | Dedicated `/history` page with vinyl cards, hero banner, filters, and pagination |

---

## 🛠 Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 19 | UI framework with concurrent rendering |
| **Vite** | 6 | Build tool & dev server (sub-200ms HMR) |
| **Tailwind CSS** | v4 | Utility-first styling with custom design tokens |
| **Zustand** | Latest | Lightweight global state management |
| **React Router DOM** | v7 | SPA routing with protected route guards |
| **Lucide React** | Latest | Icon library (consistent visual language) |
| **react-hot-toast** | Latest | Toast notification system |
| **YouTube IFrame API** | — | Embedded YouTube player for audio streaming |
| **Google Identity Services** | — | Google One-Tap OAuth sign-in |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **NestJS** | 10 | Modular TypeScript backend framework |
| **Node.js** | 22 | JavaScript runtime |
| **Prisma ORM** | 7 | Type-safe database client with migrations |
| **PostgreSQL** | 16 | Relational database (hosted on Neon Serverless) |
| **Passport.js** | — | Authentication strategy framework |
| **jsonwebtoken** | — | JWT access & refresh token signing/verification |
| **@nestjs/schedule** | — | In-process cron job scheduler |
| **natural** | — | TF-IDF text similarity engine (Node.js NLP) |

### Infrastructure

| Service | Purpose |
|---|---|
| **Vercel** | Frontend hosting — Global Edge CDN, sub-200ms TTFB |
| **Render** | Backend hosting — NestJS Web Service |
| **Neon PostgreSQL** | Serverless PostgreSQL with DB branching (staging/prod) |
| **Google Cloud** | YouTube Data API v3 (2 projects × 10K units/day) |
| **cron-job.org** | External healthcheck pinger (every 12 min, prevents Render cold start) |

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Vercel)                               │
│          React 19 + Vite 6 + Tailwind CSS v4                        │
│          Global Edge CDN • Sub-200ms TTFB                           │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                 HTTPS API Calls / JWT Bearer Token
                              │
┌─────────────────────────────▼────────────────────────────────────────┐
│                      BACKEND (Render)                                │
│            NestJS 10 • TypeScript • Node 22                         │
│            Modular Monolith • Dual Key Rotation                     │
│                                                                      │
│  Modules:                                                            │
│  ├── AuthModule         → Google OAuth + JWT + Silent Refresh        │
│  ├── TracksModule       → YouTube proxy, search caching, key mgr    │
│  ├── RecommendationsModule → TF-IDF engine, Explore feed, crons     │
│  ├── PlaylistsModule    → CRUD, position reorder, mosaic covers     │
│  ├── HistoryModule      → Listen log, favorites, play count          │
│  └── HealthModule       → /healthcheck (DB ping + wake-up signal)    │
└───────────────┬─────────────────────────┬────────────────────────────┘
                │                         │
  Prisma ORM / PgBouncer             YouTube Data API v3
  Connection Pool                    (Dual Key A & B)
                │                         │
┌───────────────▼──────────┐   ┌──────────▼───────────────────────────┐
│  PostgreSQL 16 (Neon)    │   │  YouTube API Cloud                   │
│  Serverless PG           │   │  Key A & B (10K units/day each)      │
│  FTS + Trigram GIN index │   │  30-Day TTL Metadata Caching         │
│  Staging & Prod Branches │   │  Proxy-only (key never on client)    │
└──────────────────────────┘   └──────────────────────────────────────┘
```

### Backend URL Resolution

The frontend uses a smart URL resolver (`getBackendURL()` in `api.js`):
- On **localhost** → pings `/healthcheck` to discover if local backend is running
- On **production** → uses `VITE_PROD_BACKEND_URL` (Render URL)
- Result is **cached in-memory** for the session lifetime

### Authentication Flow

```
User → Google One-Tap / "Sign in with Google"
  → Frontend sends Google ID Token to backend
  → Backend verifies token via Google API
  → Backend issues:
      ├── Short-lived JWT Access Token  (15 minutes, in response body)
      └── Long-lived Refresh Token      (7 days, HttpOnly cookie)
  → Frontend stores user profile + access token in Zustand (persisted)
  → Silent refresh timer fires at 13.5 minutes (before access token expires)
  → On page reload → App.jsx runs checkAuth() → hits /api/auth/refresh
      → new access token issued → user stays logged in seamlessly
```

---

## 📱 Pages & Features

### 🏠 Home Dashboard (`/`)

The central hub of AudioScape, structured as a rich discovery dashboard.

| Section | Component | Description |
|---|---|---|
| **Spotlight Hero** | `HeroSection.jsx` | Auto-cycling banner with 1000ms silky crossfade and Ken Burns zoom animation |
| **Daily Mix Cards** | `DailyMixCards.jsx` | 2–3 grouped mix cards seeded from TF-IDF recommendation keywords — 1-click Play Mix loads directly into queue |
| **Recently Played** | `RecentlyPlayed.jsx` | Hero + compact row layout. Left: last played track with RESUME button. Right: 7 compact rows. "VIEW ALL" routes to `/history` |
| **AI Recommendations** | `RecommendForYou.jsx` | Multi-level fallback recommendation grid. Featured spotlight card + staggered tracks. Zero orphan cards |
| **Favorite Songs** | `FavoriteSongs.jsx` | Vinyl record peeking hover animation, rank badges (#1, #2 …), scroll buttons |

---

### 🔍 Discover / Explore Page (`/explore`)

The genre-based music exploration feed, powered by a server-side pre-warmed cache.

- **Genre Category Slider** — 10 curated genre categories (Pop, Lo-fi, K-pop, Hip-Hop, Indie, Rock, Electronic, Jazz, Classical, Synthwave)
- **Server-Side Explore Feed** — Strategy A (genre keywords) & Strategy C (cluster deduplication) ensure diverse results
- **Pre-Warming Cron** — Backend refreshes the explore cache every 24 hours automatically
- **Discover-Style Pagination** — "Showing X of Y tracks • Page A of B" counter, numbered pills with ellipsis windowing, Prev/Next, Go-to jump input
- **Grid / List mode** — Toggle between card grid and compact list view; preserves active page when switching modes
- **Category fallback** — If backend is offline, frontend falls back to localStorage cache or 10 curated `DEFAULT_SHOWCASE_CATEGORIES`

---

### 📜 Listening History Page (`/history`)

A dedicated, modernized history dashboard — the most recently completed major feature.

| Component | File | Description |
|---|---|---|
| **Hero Banner** | `HistoryHeroBanner.jsx` | Ambient violet glowing orbs, "Listen Again" gradient title, animated 3D rotating 3-card artwork stack (cycles every 5s), Play All + Shuffle CTAs |
| **Filter Bar** | `HistoryFilterBar.jsx` | Real-time search, sort dropdown (Recently Played / Most Played / Title A-Z / Artist A-Z), direction toggle, Grid/List switcher, filtered count badge |
| **Vinyl Card** | `HistoryVinylCard.jsx` | Album sleeve + spinning vinyl disc on hover, **violet accent** theme (border, glow, play button), rank badge, like toggle, Add to Playlist |
| **Pagination** | Inline | Discover-style: counter label, numbered pills, ellipsis windowing, Prev/Next, Go-to input |

**Key behaviors:**
- Rank continuity across pages: Page 2 shows #51–#100 (not reset to #1)
- View mode (Grid/List) switch preserves the active page
- Hero banner always shows the top 5 latest tracks, regardless of current page
- Auto-revalidates data via `useRefreshOn("history", ...)` when new songs are played

---

### ❤️ Favorites Page (`/favourites`)

All songs the user has liked, with the same rich UI parity as the History page.

- Vinyl card grid with pink/rose accent theme
- Favorites Hero Banner with animated artwork stack
- Filter & sort controls identical to History page
- **Discover-Style Pagination** — counter, numbered pills, Go-to jump input
- Rank continuity across pages (Page 2 = #51–#100)
- View mode preserves active page

---

### 🎵 Playlists Page (`/playlists`) & Playlist Detail

Create and manage personal music collections.

- **Playlist Grid** — 2×2 mosaic cover art generated from the first 4 track thumbnails
- **Create / Delete Playlists** — Named custom playlists with instant UI feedback
- **Playlist Detail** — Full track list with drag-and-drop position reordering
- **Add to Playlist** — Available from every track card across the app (via modal)
- **Track Removal** — Remove individual tracks from a playlist inline

---

### 🔎 Search

**3-Tier Search Pipeline (quota-optimized):**

| Tier | Source | Quota Cost | When Used |
|---|---|---|---|
| 1 | Page Cache (`SearchQuery` table) | **0 units** | Exact previous query match |
| 2 | PostgreSQL FTS (GIN trigram index) | **0 units** | Partial/fuzzy match in track DB |
| 3 | YouTube Data API v3 (`search.list`) | **100 units** | No local cache match |

Results from Tier 3 are cached in PostgreSQL for 24 hours — the same query costs 0 units on subsequent calls.

---

### 🏠 Landing Page (`/landing`)

Public-facing entry for unauthenticated visitors:
- Feature highlights and product marketing
- Google One-Tap Sign-in integration
- Theme toggle (Light/Dark/System)
- Branded 4-column app footer (navigation, library, social links)

---

## 🔧 Core Systems

### 1. Music Player System

The player has **two modes**, switchable via the Sidebar footer toggle (persisted in `localStorage`):

#### FullScreen Player — Default Mode

- Launches automatically when any track is played (default: `audioscape_default_player_mode = 'full'`)
- **2-line slow sliding track title (`SlidingTrackTitle`):**
  - Short titles (1–2 lines): static, centered
  - Very long titles (>2 lines): gentle vertical slide with 3.5s reading pauses, gradient edge masks, pauses on hover
  - Horizontal marquee at 45s speed for extreme overflow
- **Floating corner controls:**
  - Top-left: `Minimize2` button (switches to MiniPlayer) + Theme Switcher
  - Top-right: Mobile queue drawer toggle
- Right panel: Playback controls, progress bar, queue drawer
- Keyboard shortcut: `Esc` to minimize

#### Mini Player — Compact Mode

- Four layout modes: `float`, `slim`, `dock`, `corner`
- Fixed thumbnail dimensions (`aspect-square h-12 w-12 shrink-0`)
- Strict text bounds — `line-clamp-1 truncate` on title and artist (prevents thumbnail overflow)
- Expand button returns to FullScreen player

#### Sidebar Player Mode Toggle
- **Expanded sidebar:** `[ Full | Mini ]` segmented pill toggle with brand accent on active
- **Collapsed sidebar:** Icon button (`Maximize2` / `Minimize2`) with hover tooltip

---

### 2. TF-IDF Recommendation Engine

A **zero-quota-cost** content-based filtering system that runs entirely on PostgreSQL data:

```
User Listening History (track titles, genres, tags)
           ↓
    TF-IDF Vectorization (via `natural` npm)
           ↓
  Cosine Similarity Scoring against Corpus
           ↓
  Top-N Recommended Track IDs from DB Cache
           ↓
   Frontend RecommendForYou.jsx / DailyMixCards.jsx
```

**4-tier fallback pipeline** (guarantees 100% section visibility even for new users):
1. User's own history-based TF-IDF recommendations
2. Top globally popular tracks from DB
3. Curated keyword searches
4. Static default showcase categories

---

### 3. Dual YouTube API Key Manager

```
Per API call:
  1. Check ApiQuotaUsage for today's active key
  2. Active key < 8,000 units   → use active key
  3. Active key ≥ 8,000 units   → switch to backup key
  4. Both keys ≥ 8,000 units    → cache-only mode (FTS only)
  5. Active key alternates daily (odd/even day of month)
```

| YouTube Endpoint | Units per Call |
|---|---|
| `search.list` | 100 |
| `videos.list` (batch 50 IDs) | 1 |
| `videoCategories.list` | 1 |

---

### 4. Auth System

- **Google OAuth 2.0** via Google Identity Services (frontend token) + backend verification
- **JWT Access Token** — 15 minutes, returned in response body
- **Refresh Token** — 7 days, stored in HttpOnly cookie (CSRF-safe)
- **Silent Refresh** — Proactive timer fires at ~13.5 minutes to refresh before expiry
- **Startup Auth Check** — `App.jsx` runs `checkAuth()` on mount; shows branded splash screen while `isCheckingAuth` is true (no login-page flash)
- **`@OptionalAuth()` decorator** — Allows guest access to public endpoints (Explore, Categories) while still authenticating users who provide a token


---

## 🗄 Database Schema

PostgreSQL schema managed via Prisma migrations:

| Table | Description |
|---|---|
| `users` | User accounts (Google sub ID, name, email, avatar) |
| `tracks` | YouTube track metadata cache (ID, title, channel, duration, thumbnail, genre, tags, `isAvailable`, `lastFetchedAt`) |
| `channels` | YouTube channel metadata (upserted during track ingestion) |
| `listen_history` | Per-user track play log (`userId`, `trackId`, `playCount`, `lastPlayedAt`, `liked`, `source`) |
| `playlists` | User-created playlists (name, cover thumbnails, position) |
| `playlist_tracks` | Junction table linking tracks to playlists with `position` for reordering |
| `search_queries` | Cached search queries with TTL (`queryType`, `hitCount`, `expiresAt`) |
| `search_query_pages` | Paginated results per search query |
| `search_query_results` | Individual track results per page |
| `api_quota_usage` | Per-key, per-day, per-endpoint YouTube quota consumption log |

**PostgreSQL Optimizations:**
- `GIN` trigram index on `tracks.title` for sub-5ms full-text search
- `tsvector` column with trigger for PostgreSQL FTS
- Composite unique index on `listen_history(userId, trackId)`

---

## 💻 Installation & Setup

### Prerequisites

- Node.js v22+
- npm or pnpm
- PostgreSQL instance (local or [Neon](https://neon.tech) free tier)
- Google Cloud project with YouTube Data API v3 enabled
- Google OAuth 2.0 Client ID

### 1. Clone the Repository

```bash
git clone https://github.com/Anirban780/AudioScape.git
cd AudioScape
```

### 2. Install Dependencies

```bash
# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install
```

### 3. Configure Environment Variables

Create `.env` files in both `frontend/` and `backend/` directories with your credentials (Google OAuth, YouTube API keys, PostgreSQL connection string, JWT secrets). Refer to [`plan/README.md`](plan/README.md) for the complete environment variable inventory.

### 4. Set Up the Database

```bash
cd backend
npx prisma generate       # Generate Prisma client
npx prisma migrate dev    # Run migrations
```

### 5. Run Locally

```bash
# Terminal 1 — Backend (http://localhost:5000)
cd backend && npm run start:dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend && npm run dev
```

---

## 🤝 Contributing

1. Fork the repository
2. Cut a branch from `staging`: `git checkout -b feat/your-feature staging`
3. Commit using Conventional Commits: `feat: add new feature`
4. Open a Pull Request targeting `staging` (not `main`)

---

## 📜 License

This project is licensed under the **MIT License**.

---

## 📬 Contact

📧 [fairytailanirbans@gmail.com](mailto:fairytailanirbans@gmail.com)  
🐙 [GitHub — @Anirban780](https://github.com/Anirban780)

---

<div align="center">

**AudioScape v2.0.0** — Built with ❤️ using React, NestJS, and PostgreSQL

*Stream boldly. Discover deeply.*

</div>
