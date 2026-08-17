# Explore Page Redesign Documentation (`ExplorePage.jsx`)

> **Project:** AudioScape  
> **Reference Stitch Screens:**  
> - Dark Theme: `Nocturnal Glassy Explore & Search` (`6aaba54d100944a28329f65c95eb684f`)  
> - Light Theme (Variant 1): `Fragrant Glassy Explore & Search` (`3c52c41b3d7e40b89b4e98157e63aaae`)  
> - Light Theme (Variant 2): `Fragrant Glassy Explore & Search` (`e8bef34ec53d4382bba063b4a4d375d1`)  
> **Implementation Date:** 2026-08-03  

---

## 🎯 Executive Overview

The Explore Music Page (`ExplorePage.jsx`) has been completely redesigned into a modular, high-contrast music discovery dashboard based on Stitch's `Midnight Studio` (Dark) and `Aura Lumina` (Light) design systems. 

It breaks down the music discovery experience into **5 distinct architectural sections**:

```
+-------------------------------------------------------------------+
| 🔍 Explore Music                                                  |
| [All] [Lofi & Chill] [Pop Hits] [Indie Rock] [Electronic] ...    |  <-- 1. Filter Pills
+-------------------------------------------------------------------+
| 🔥 TRENDING #1 SPOTLIGHT HERO BANNER                             |  <-- 2. Trending Banner
| Discover Today's Top Soundscapes - [START LISTENING]              |
+-------------------------------------------------------------------+
| 🧭 Browse Categories (4-Column Grid)                               |  <-- 3. Category Grid
| [🎧 Lofi]  [🎤 Pop]  [🎸 Indie]  [⚡ EDM] [🔥 Hip Hop] [🎷 Jazz]  |
+-------------------------------------------------------------------+
| 📀 Keyword Music Sections (5-Column Album Card Grid)              |  <-- 4. Track Sections
| Section Title 1 ... [Music Cards Grid] [MORE TRACKS]               |
| Section Title 2 ... [Music Cards Grid] [MORE TRACKS]               |
+-------------------------------------------------------------------+
| 🎧 Your Saved Playlists Carousel                                  |  <-- 5. Playlists Carousel
| [Playlist Card 1] [Playlist Card 2] ... [VIEW ALL]                |
+-------------------------------------------------------------------+
```

---

## 🛠️ Component Breakdown & Responsibilities

### 1. `ExploreFilterPills.jsx`
- **Location:** `frontend/src/components/Explore/ExploreFilterPills.jsx`
- **Purpose:** Horizontal scrollable genre/mood filter pills bar.
- **Stitch Design Alignment:** Replicates the filter bar from screens `6aaba54d100944a28329f65c95eb684f` & `3c52c41b3d7e40b89b4e98157e63aaae`.
- **Interactive State:** Active selection renders `bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-lg`.
- **Functionality:** Clicking a pill triggers `handleGenreSelect(genreQuery)` in `ExplorePage`, fetching YouTube tracks for that query if not already cached.

### 2. `ExploreTrendingBanner.jsx`
- **Location:** `frontend/src/components/Explore/ExploreTrendingBanner.jsx`
- **Purpose:** Wide discovery spotlight banner showcasing the #1 trending track.
- **Stitch Design Alignment:** Matches the glassmorphic spotlight hero card (`rounded-[32px]`) from Stitch.
- **Visual Features:** Full-width background image with centered object positioning (`object-cover object-center`), linear gradient backdrop fade, "TRENDING #1" pill badge, and "START LISTENING" CTA button.
- **State Handling:** Renders `Skeleton` loading container while data is resolving.

### 3. `ExploreCategoryGrid.jsx`
- **Location:** `frontend/src/components/Explore/ExploreCategoryGrid.jsx`
- **Purpose:** Responsive 4-column grid of genre discovery cards (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4`).
- **Visual Features:** Curated gradient color backgrounds (`from-purple-700 to-blue-600`, `from-pink-600 to-purple-600`, etc.), category icons, and hover scale zoom (`hover:scale-[1.03]`).
- **Functionality:** Clicking a category tile invokes `onCategoryClick(query)` to fetch and scroll to category search results.

### 4. `ExploreSection.jsx`
- **Location:** `frontend/src/components/Explore/ExploreSection.jsx`
- **Purpose:** Individual keyword music track feed section.
- **Stitch Design Alignment:** 5-column responsive card grid (`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5`).
- **Features:** Track count badge, `MusicCard` components with glowing play overlays, and "MORE TRACKS" pagination trigger.

### 5. `ExplorePlaylistsCarousel.jsx`
- **Location:** `frontend/src/components/Explore/ExplorePlaylistsCarousel.jsx`
- **Purpose:** Horizontal scroll-snap carousel of user's saved playlists.
- **Data Synchronization:** Reads user playlists directly from `usePlaylistStore` (Firestore).
- **Empty State:** Renders an inviting glassmorphic empty state card ("No Playlists Created Yet") with a quick navigation button to `/playlists` if no playlists exist.

---

## 🎨 Theme & Token System Compliance

All components consume semantic CSS design variables defined in `frontend/src/index.css`:

- **Surface Base:** `var(--color-surface-base)` (`#0B0F17` Dark / `#F8F7FC` Light)
- **Surface Raised:** `var(--color-surface-raised)` (`#121724` Dark / `#FFFFFF` Light)
- **Surface Overlay:** `var(--color-surface-overlay)` (`#1B2234` Dark / `#F1F0FB` Light)
- **Border Default:** `var(--color-border-default)` (`#37435D` Dark / `#E4E1F0` Light)
- **Border Strong:** `var(--color-border-strong)` (`#4C5B7C` Dark / `#C9C3E0` Light)
- **Brand Primary:** `var(--color-primary)` (`#A78BFA` Purple)
- **Brand Secondary:** `var(--color-secondary)` (`#EC4899` Hot Pink)
- **Zero-Green Policy:** Zero `#22c55e` green colors used. All play buttons and active states use brand purple/pink tokens.

---

## 🔮 Future Scope & Deferred Components

1. **Live Friend Activity Community Feed**:
   - *Stitch Reference*: `Midnight Studio Dashboard` right-side presence module.
   - *Reason for Deferral*: Requires real-time WebSocket / Firebase RTDB presence service to track real user listening state.

2. **New Releases Dedicated API Feed**:
   - *Stitch Reference*: "New Releases" dedicated music section.
   - *Reason for Deferral*: Requires a dedicated YouTube Music / Spotify API endpoint for new release releases.

3. **AI Mood-Based Playlist Classifier**:
   - *Stitch Reference*: "Generate Mood Playlist" button.
   - *Reason for Deferral*: Scheduled for Phase 5 AI enhancements.

---

## 📂 Source Code Structure

```
frontend/src/
├── components/Explore/
│   ├── ExploreFilterPills.jsx         # Genre/mood filter pills bar
│   ├── ExploreTrendingBanner.jsx      # Spotlight hero discovery banner
│   ├── ExploreCategoryGrid.jsx        # 4-column browse categories grid
│   ├── ExploreSection.jsx             # 5-column keyword track grid section
│   └── ExplorePlaylistsCarousel.jsx   # Saved user playlists carousel
└── pages/
    └── ExplorePage.jsx                # Main Explore page orchestrator
```
