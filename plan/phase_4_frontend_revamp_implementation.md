# Phase 4 Frontend Revamp Implementation Log

> **Project:** AudioScape  
> **Reference Master Plan:** [`plan/frontend-revamp.md`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/plan/frontend-revamp.md)  
> **Status:** Phase 4.0, Step 1, Step 1.5, Step 2, Step 3, Step 4.1, & Step 4.2 Completed — Step 4.3a & 4.3b Planned  
> **Last Updated:** 2026-08-12  

---

## 📑 Executive Overview & Chronological Progress

This document serves as the canonical execution record for **Phase 4 (Frontend Visual + Structural Revamp)** of AudioScape. All modifications follow the Stitch design system tokens (`Midnight Studio` dark theme & `Aura Lumina` light theme), enforcing a strict **Purple / Pink / Blue / White / Black** color palette (zero green `#22c55e`), standardizing JSDoc architectural headers (**WHAT, WHY, HOW**), and consolidating all source code under `frontend/src/`.

---

## 🛠️ Completed Steps & Comprehensive Change Descriptions

### Phase 4.0: Structural Refactoring, File Consolidation & Path Aliasing

- **Directory Consolidation (`frontend/src/`)**:
  - Re-organized the project to establish `frontend/src/` as the single canonical root for all client-side source code.
  - Relocated and consolidated all shadcn UI primitives from root `utils/components/ui/` into [`frontend/src/components/ui/`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/ui) (`avatar.jsx`, `button.jsx`, `card.jsx`, `dropdown-menu.jsx`, `input.jsx`, `skeleton.jsx`, `switch.jsx`, `textarea.jsx`).
  - Standardized utility class merging helper `cn()` in [`frontend/src/lib/utils.js`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/lib/utils.js).
  - Migrated all feature folders into `frontend/src/`:
    - Components: `Auth/`, `Cards/`, `Explore/`, `Home/`, `Layout/`, `Player/`, `Playlist/`, `ui/`
    - Core: `App.jsx`, `main.jsx`, `ThemeProvider.jsx`, `ResponsiveLayout.jsx`, `index.css`
    - Context & Firebase: `context/AuthContext.jsx`, `firebase/firebaseConfig.js`
    - State Management: `store/usePlayerStore.js`, `store/usePlaylistStore.js`
    - Pages: `ExplorePage.jsx`, `FavoritesPage.jsx`, `HelpFeedback.jsx`, `Home.jsx`, `LandingPage.jsx`, `NotFound.jsx`, `PlaylistsPage.jsx`
    - Utilities: `utils/api.js`, `utils/generateQueue.js`, `utils/keywords.js`, `utils/playlists.js`, `utils/youtube.js`

- **Path Aliasing & Configuration**:
  - Updated `vite.config.js` to map `@` alias to `./frontend/src` and `@/assets` to `./frontend/assets`.
  - Configured Vite dev server in `vite.config.js` and `package.json` for Docker: `host: '0.0.0.0'`, `port: 5173`, `strictPort: true`.
  - Updated `jsconfig.json` compiler path mapping: `"@/*": ["frontend/src/*"]`.
  - Updated `components.json` shadcn configuration to target `frontend/src/index.css` and `@/components/ui`.
  - Refactored all import statements across all ~40 component and page files to use clean `@/` pathing.

---

### Step 1: Design System Token Integration

- **Stitch Design System Tokens (`index.css`)**:
  - Defined CSS variables in [`frontend/src/index.css`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/index.css) for Midnight Studio (Dark Mode) and Aura Lumina (Light Mode).
  - Primary Brand Token: `#A78BFA` (Purple), Secondary Brand Token: `#EC4899` (Pink), Tertiary Accent: `#2563EB` (Blue).
  - Removed hardcoded Tailwind slate/gray colors in favor of semantic tokens (`var(--color-surface-base)`, `var(--color-surface-raised)`, `var(--color-surface-overlay)`, `var(--color-border-default)`, `var(--color-border-strong)`).
  - Enforced strict zero-green policy (`#22c55e` replaced with brand primary/secondary tokens everywhere).

- **Dark Mode Outline Contrast Adjustments**:
  - Lifted Midnight Studio dark theme border contrast tokens: `--color-border-default: #37435D`, `--color-border-strong: #4C5B7C`, `--color-surface-raised: #121724`, `--color-surface-overlay: #1B2234`.
  - Solved dark mode component edge invisibility, ensuring distinct borders around cards, sidebar rail, top header, and floating player widgets.

---

### Step 1.5: State & Store Shape Audit

- **Zustand Player Store (`usePlayerStore.js`)**:
  - Added full JSDoc type definitions for player state properties (`currentTrack`, `isPlaying`, `progress`, `duration`, `volume`, `isMuted`, `isLiked`, `isLooping`, `isShuffling`, `queue`, `currentIndex`, `isFullScreen`).
  - Added clean state mutators (`setTrack`, `togglePlayPause`, `nextTrack`, `prevTrack`, `toggleLike`, `toggleLooping`, `toggleShuffling`, `toggleFullScreen`).
- **Zustand Playlist Store (`usePlaylistStore.js`)**:
  - Audited Firestore user playlist state mapping and action dispatchers.

---

### Step 2: AppShell Layout Extraction & Unification

- **[`AppLayout.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Layout/AppLayout.jsx)**:
  - Extracted a unified layout shell wrapping all pages with a sticky glassmorphic top header bar, theme toggle button, user avatar dropdown, collapsible sidebar, mobile navigation drawer, and bottom player dock clearance (`pb-28 md:pb-32`).
- **[`App.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/App.jsx)**:
  - Removed artificial 1-second route change delay (`setTimeout`).
  - Added `/profile` route mapping to prevent broken navigation links.
  - Co-located persistent `<PlayerContainer>` and `<PlaylistModal>` overlays.
- **Page Unification**:
  - Refactored `Home.jsx`, `ExplorePage.jsx`, `FavoritesPage.jsx`, `PlaylistsPage.jsx`, and `HelpFeedback.jsx` to wrap in `<AppLayout>`.

---

### Step 3: Component-Level Token Migration

Swept and updated all UI components to use semantic Stitch CSS variables and added JSDoc documentation headers (**WHAT**, **WHY**, **HOW**):

1. **Home & Navigation Components**:
   - [`Sidebar.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Home/Sidebar.jsx): Background → `surface-raised`, active link → `state-active` + `primary` text, border → `border-default`.
   - [`SearchBar.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Home/SearchBar.jsx): Input background → `surface-base`, focus ring → `primary`, live search dropdown panel → `surface-overlay`.
   - [`HeroSection.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Home/HeroSection.jsx): Brand overlay gradients & tokens.
   - [`UserMenu.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Auth/UserMenu.jsx): Dropdown panel → `surface-overlay`, menu items hover → `state-hover`.
   - [`RecommendForYou.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Home/RecommendForYou.jsx) & [`RecentlyPlayed.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Home/RecentlyPlayed.jsx): Card containers → `surface-raised`, scroll buttons → `primary` tokens.

2. **Cards & Modals**:
   - [`MusicCard.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Cards/MusicCard.jsx): Card bg → `surface-raised`, border → `border-default`, hover state → `state-hover`, hover play overlay → `primary`.
   - [`PlaylistModal.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Playlist/PlaylistModal.jsx): Panel → `surface-overlay`, border → `border-strong`, green CTA button (`bg-green-600`) replaced with `bg-[var(--color-primary)]`.

3. **Player & Audio Controls**:
   - [`PlayerControls.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Player/PlayerControls.jsx): Play/pause button → `primary` bg with `text-on-primary`, secondary buttons → `state-hover`, active toggles → `primary`.
   - [`ProgressBar.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Player/ProgressBar.jsx) & [`VolumeBar.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Player/VolumeBar.jsx): Track → `border-default`, progress fill & handle → `primary`.
   - [`MiniPlayer.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Player/MiniPlayer.jsx): Floating panel → `surface-overlay`/90 backdrop-blur-md, border → `border-strong`.
   - [`FullScreenPlayer.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Player/FullScreenPlayer.jsx): Background → `surface-base`.
   - [`TrackQueue.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Player/TrackQueue.jsx): Drawer bg → `surface-raised`, active row → `state-active`, hover → `state-hover`.

---

### Step 4.1: Home Page Visual Rebuild & Structure Refinement (Completed)

Rebuilt and refined the Home Page structure (`Home.jsx`):

1. **[`HeroSection.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Home/HeroSection.jsx)**:
   - **Stitch 2-Column Visual Platform Dashboard Hero** (`lg:grid-cols-12`).
2. **[`RecommendForYou.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Home/RecommendForYou.jsx)**:
   - **Stitch 5-Second Auto-Rotating Daily Mix Banner Carousel**.
3. **[`RecentlyPlayed.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Home/RecentlyPlayed.jsx)**:
   - **Stitch 5-Column Album Card Grid** with skeleton loading & glassmorphic empty state.
4. **[`FavoriteSongs.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Home/FavoriteSongs.jsx)**:
   - **Favorites Carousel at the Last**, fetching Firestore liked songs with skeleton loading & empty state.

---

### Step 4.2: Explore Page Visual Rebuild (Completed)

Rebuilt `ExplorePage.jsx` into a modular music discovery dashboard matching Stitch screens `6aaba54d100944a28329f65c95eb684f`, `3c52c41b3d7e40b89b4e98157e63aaae`, & `e8bef34ec53d4382bba063b4a4d375d1`:

1. **[`ExploreFilterPills.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Explore/ExploreFilterPills.jsx)** *(NEW)*:
   - Horizontal scrollable filter pills ("All", "Lofi & Chill", "Pop Hits", "Indie Rock", "Electronic & EDM", "Hip Hop", "Jazz & Soul", "Focus & Ambient", "Anime & OST", "K-Pop").
   - Active pill highlighted in brand gradient `from-[var(--color-primary)] to-[var(--color-secondary)] text-white`.
2. **[`ExploreTrendingBanner.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Explore/ExploreTrendingBanner.jsx)** *(NEW)*:
   - Wide discovery spotlight banner showcasing #1 trending song with full-width artwork, gradient overlays, "TRENDING #1" pill badge, and "START LISTENING" CTA.
3. **[`ExploreCategoryGrid.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Explore/ExploreCategoryGrid.jsx)** *(NEW)*:
   - 4-column responsive grid (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4`) of genre discovery tiles with vibrant gradient backgrounds and hover scale zoom.
4. **[`ExploreSection.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Explore/ExploreSection.jsx)** *(NEW)*:
   - 5-column responsive album card grid for keyword music sections with track count badges and "MORE TRACKS" pagination buttons.
5. **[`ExplorePlaylistsCarousel.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Explore/ExplorePlaylistsCarousel.jsx)** *(NEW)*:
   - Horizontal scroll-snap carousel of user's saved playlists fetched from Firestore via `usePlaylistStore`.
6. **[`ExplorePage.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/pages/ExplorePage.jsx)**:
   - Assembled all 5 sections inside `<AppLayout>` with clean surface tokens and responsive spacing.
7. **[`plan/explore_page_redesign.md`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/plan/explore_page_redesign.md)** *(NEW)*:
   - Created dedicated documentation detailing the Explore Page architecture, ### Step 4.3a: Home Page — Focus Flow Replacement with Grouped Daily Mix Cards (Completed)

> **Problem Statement:** The "Focus Flow" card inside [`HeroSection.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Home/HeroSection.jsx#L216-L240) occupied the right 4-column slot of the hero grid on the **authenticated** Home page with static marketing copy ("Deep concentration beats & spatial soundscapes…") and a non-functional button.

> **Solution Implemented:** Replaced Focus Flow with **`DailyMixCards.jsx`** — 2–3 grouped mix cards in the hero right slot (`lg:col-span-4`), seeded directly from top recommendation keywords/genres (`sourceKeyword`) in user history (e.g., "Mix: Lo-fi", "Mix: K-pop", "Mix: Ambient"). Removed `MoodPicker.jsx` for clean high-density layout.

#### Implementation Summary

##### 1. Created `DailyMixCards.jsx` — `frontend/src/components/Home/DailyMixCards.jsx` *(NEW)*

```
Props: { recommendations }
Layout:
  - Fits right inside the lg:col-span-4 slot (h-[340px] sm:h-[370px])
  - Groups TF-IDF recommendations payload by sourceKeyword into 2–3 distinct Daily Mix cards
  - Each card shows: MIX # badge, mix title (e.g., "Mix: Lo-Fi"), album thumbnail, artist list, track count
  - 1-Click "Play Mix" button -> loads mix tracks into usePlayerStore queue & streams track #0
Tokens: surface-raised, border-strong, primary tokens
```

##### 2. Updated `api.js` — [`frontend/src/utils/api.js`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/utils/api.js)

```js
// getRecommendations now preserves sourceKeyword on every returned track object
sourceKeyword: item.sourceKeyword || item.keyword || (Array.isArray(item.genre) ? item.genre[0] : item.genre) || "Daily Mix"
```

##### 3. Updated `HeroSection.jsx` & `Home.jsx`

- Replaced Focus Flow / JumpBackIn in `HeroSection.jsx` with `<DailyMixCards recommendations={recommendations} />`.
- Updated `Home.jsx` to fetch `getRecommendations(20)` on mount and pass tracks down to `<HeroSection />`. Removed `MoodPicker`.

#### Files Modified / Created

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/components/Home/DailyMixCards.jsx` | **NEW** | Grouped 2-3 Daily Mix cards in hero right slot |
| [`HeroSection.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Home/HeroSection.jsx) | **MODIFY** | Replaced right hero slot with `<DailyMixCards />` |
| [`Home.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/pages/Home.jsx) | **MODIFY** | Fetches recommendations for hero mixes, removed MoodPicker |
| [`api.js`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/utils/api.js) | **MODIFY** | Preserved `sourceKeyword` in recommendation items |5/Documents/GitHub/AudioScape/backend/services/RecommendationsService.js) | MODIFY (Phase 2) | Add grouped mode by `sourceKeyword` |

---

### Step 4.3b: Mobile Footer Player — `MobilePlayerBar` & Viewport Branching

> **Problem Statement:** [`MiniPlayer.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Player/MiniPlayer.jsx) uses `react-rnd` for a draggable/resizable floating window pinned near the bottom-right. This is a reasonable **desktop** pattern (picture-in-picture). On mobile it's the wrong metaphor — a draggable/resizable box doesn't fit a small screen, ignores safe areas, and conflicts with thumb reach. **Keep MiniPlayer for desktop. Create a new `MobilePlayerBar` for mobile.**

#### Architecture: Branch by Viewport in PlayerContainer

```
PlayerContainer.jsx
 ├─ isFullScreen        → FullScreenPlayer   (unchanged)
 ├─ mobile viewport     → MobilePlayerBar    (NEW)
 └─ desktop viewport    → MiniPlayer         (existing, unchanged)
```

#### Step 1: Create `useMediaQuery` Hook — `frontend/src/hooks/useMediaQuery.js` *(NEW)*

> **Note:** The project currently has no `useIsMobile` hook (only `useInView.js` exists in `hooks/`). Create a general-purpose `useMediaQuery` hook using `window.matchMedia` (not a resize listener — matchMedia is more performant and correct for CSS breakpoint alignment).

```jsx
// frontend/src/hooks/useMediaQuery.js
import { useState, useEffect } from "react";

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}
```

Usage in `PlayerContainer.jsx`:
```jsx
const isMobile = useMediaQuery("(max-width: 768px)");
```

**Do NOT** recompute this with a `ResizeObserver` per-component. One shared hook, one source of truth.

#### Step 2: Create `MobilePlayerBar.jsx` — `frontend/src/components/Player/MobilePlayerBar.jsx` *(NEW)*

**v1 spec (ship first — tap-only, zero new dependencies):**

```
Layout:
  - Fixed full-width bar, positioned just above env(safe-area-inset-bottom)
  - Height: ~64px
  - Left: Thumbnail (48×48 rounded) + Title/Artist (truncate or marquee-scroll on overflow)
  - Right: Play/Pause button + Skip Next button
  - Top edge: Thin 2px progress line (not the full ProgressBar component — saves vertical space)
  - Background: var(--color-surface-overlay)/90 + backdrop-blur-md (matches existing MiniPlayer glass style)
  - Border: 1px solid var(--color-border-strong) on top edge only

State:
  - Reads from usePlayerStore (currentTrack, isPlaying, progress, duration)
  - Reuses PlayerControls logic — DO NOT duplicate playback state
  - togglePlayPause, nextTrack wired to same store actions

Interaction (v1):
  - Tap anywhere on the bar (except buttons) → setIsFullScreen(true) → opens FullScreenPlayer
  - This is the standard Spotify/YouTube Music pattern: tap bar → expand

CSS position:
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  z-index: 40;
```

#### Step 3: Modify [`PlayerContainer.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Player/PlayerContainer.jsx) — Add Mobile/Desktop Branch

Current render logic (lines ~95–110):
```jsx
return (
  <>
    <YoutubePlayer trackId={track?.id} onReady={onPlayerReady} />
    {isFullScreen ? (
      <FullScreenPlayer ... />
    ) : (
      <MiniPlayer ... />
    )}
  </>
);
```

**Change to:**
```jsx
import { useMediaQuery } from "@/hooks/useMediaQuery";
import MobilePlayerBar from "./MobilePlayerBar";

// Inside component:
const isMobile = useMediaQuery("(max-width: 768px)");

return (
  <>
    <YoutubePlayer trackId={track?.id} onReady={onPlayerReady} />
    {isFullScreen ? (
      <FullScreenPlayer ... />
    ) : isMobile ? (
      <MobilePlayerBar
        track={track}
        player={player}
        isPlayerReady={isPlayerReady}
      />
    ) : (
      <MiniPlayer ... />
    )}
  </>
);
```

This is a clean additive change — `MiniPlayer` is completely untouched, `FullScreenPlayer` is completely untouched.

#### Step 4: Fix `viewport-fit=cover` in [`index.html`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/index.html)

Current:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

**Change to:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

Without this, `env(safe-area-inset-bottom)` won't work on iOS notched/gesture-nav devices and the mobile bar will be partially obscured by the home indicator.

#### Phased Rollout

| Phase | What Ships | New Dependencies | Risk |
|-------|-----------|-----------------|------|
| **v1** | `useMediaQuery` + `MobilePlayerBar` (tap-to-expand only) + viewport-fit fix | None | Low — additive, desktop unchanged |
| **v2** | Swipe-to-expand via `vaul` (shadcn's Drawer), backdrop-blur styling, marquee text, CSS equalizer icon | `vaul` (already shadcn-based, minimal) | Low |
| **v3** | Ambient color extraction from album art (canvas pixel average, cached per trackId), shared between mobile bar and `FullScreenPlayer` backdrop | None (canvas API) | Medium |

#### Visual Polish Ideas (v2/v3)

| Idea | Effort | Impact |
|------|--------|--------|
| Ambient background color sampled from track thumbnail (canvas pixel average, cached per track id) | M | Single biggest visual upgrade — makes "now playing" feel alive |
| `backdrop-blur` translucent bar instead of solid fill | S | Consistent with existing [`Footer.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Layout/Footer.jsx) glass style |
| Small animated CSS-only equalizer-bar icon while playing | S | Communicates "now playing" at a glance |
| Marquee scroll for long titles | S | Small but noticeable polish |
| `navigator.vibrate()` haptic tick on control taps (where supported) | S | Native-app feel for near-zero cost |
| Reuse ambient-color extraction as full-bleed blurred backdrop in `FullScreenPlayer` | M | Consistency — currently `FullScreenPlayer` has flat `surface-base` bg |

#### Files Changed

| File | Action | Notes |
|------|--------|-------|
| `frontend/src/hooks/useMediaQuery.js` | NEW | Shared `matchMedia` hook |
| `frontend/src/components/Player/MobilePlayerBar.jsx` | NEW | v1: tap-only mobile footer player |
| [`PlayerContainer.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Player/PlayerContainer.jsx) | MODIFY | Add `isMobile` branch |
| [`index.html`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/index.html) | MODIFY | Add `viewport-fit=cover` |
| `frontend/src/utils/extractAmbientColor.js` | NEW (v3) | Canvas pixel average, in-memory cache keyed by trackId |

#### No Changes Required

These files remain completely untouched:
- [`usePlayerStore.js`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/store/usePlayerStore.js) — MobilePlayerBar reads the same store
- [`ProgressBar.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Player/ProgressBar.jsx) — MobilePlayerBar uses a thin CSS line, not this component
- [`PlayerControls.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Player/PlayerControls.jsx) — May import for button logic, but no modifications
- [`MiniPlayer.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Player/MiniPlayer.jsx) — Desktop path, untouched
- [`FullScreenPlayer.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Player/FullScreenPlayer.jsx) — Untouched until v3 ambient color

#### Testing Checklist

- [ ] iOS Safari: bar respects the home-indicator safe area (`env(safe-area-inset-bottom)`)
- [ ] Android: bar doesn't collide with 3-button nav or gesture pill
- [ ] Long track titles truncate / marquee correctly without clipping
- [ ] Tap-to-expand opens `FullScreenPlayer` reliably
- [ ] (v2) Swipe-to-expand and tap-to-expand don't both fire on the same gesture
- [ ] Desktop `MiniPlayer` (`react-rnd`) is completely unaffected by these changes
- [ ] Player state (`isPlaying`, `progress`, queue) stays in sync across mobile bar ↔ full screen transitions — both read `usePlayerStore`, so this should be automatic, but verify after wiring

---

## 🔮 Future Scope & Deferred Components

1. **Friend Activity Live Presence Feed**:
   - *Stitch Reference*: `Midnight Studio Dashboard` right-side community activity module.
   - *Reason for Deferral*: Requires real-time WebSocket / Firebase RTDB presence service to track real user listening state across friends.

2. **Pro Upgrade / Hi-Fi Subscription Monetization Tier**:
   - *Stitch Reference*: Sidebar "LIMITED OFFER - Upgrade to Pro for spatial audio" promo card.
   - *Reason for Deferral*: Payment gateway integration (Stripe / Razorpay) and subscription entitlement checks are out of scope for the current release.

3. **Live Ambient Radio Stations Module**:
   - *Stitch Reference*: Navigation rail "Radios" link and live audio stream channels.
   - *Reason for Deferral*: Live HLS / Icecast audio stream ingestion backend is scheduled for Phase 5.

4. **Audio Visualizer Canvas Widget**:
   - *Stitch Reference*: FullScreen player frequency visualizer spectrum.
   - *Reason for Deferral*: Web Audio API `AnalyserNode` canvas rendering widget is planned as an enhancement after core page rebuilds.

---

## 🚀 Remaining Step 4 Roadmap

- [x] **Step 4.1**: Home Page Visual Rebuild & Favorites Carousel Integration.
- [x] **Step 4.2**: Explore Page Visual Rebuild (`ExplorePage.jsx`).
- [ ] **Step 4.3a**: Home Page Focus Flow Replacement — JumpBackIn + MoodPicker modules.
- [ ] **Step 4.3b**: Mobile Footer Player — `MobilePlayerBar` + viewport branching in `PlayerContainer`.
- [ ] **Step 4.4**: Favorites & Playlist Pages Rebuild (`FavoritesPage.jsx`, `PlaylistsPage.jsx`).
- [ ] **Step 4.5**: History & Profile Pages Rebuild (`HistoryPage.jsx`, `ProfilePage.jsx`).
- [ ] **Step 4.6**: Landing & 404 Pages Rebuild (`LandingPage.jsx`, `NotFound.jsx`).
- [ ] **Step 5**: Dead Code Cleanup & Smoke Testing.
- [ ] **Step 6**: Responsive Mobile & Touch QA Polish.
- [ ] **Step 7**: Visual QA & Final Release Validation.

---

## 📂 Current Canonical File Structure

```
frontend/
├── assets/                  # Brand image assets & WebP banners
└── src/                     # Single source of truth for frontend source code
    ├── App.jsx              # Application router & persistent layout shell
    ├── ResponsiveLayout.jsx  # Page container max-width wrapper
    ├── ThemeProvider.jsx    # Dark/Light theme provider
    ├── index.css            # Stitch design system CSS variables & tokens
    ├── main.jsx             # React DOM entry point
    ├── components/
    │   ├── Auth/            # User avatar dropdown & authentication controls
    │   ├── Cards/           # Track cards with play overlays & playlist actions
    │   ├── Explore/         # Filter pills, Trending banner, Category grid, Track section, Playlists carousel
    │   ├── Home/            # Hero banner, Search bar, Sidebar, Recently played, Recommendations, FavoriteSongs, JumpBackIn (PLANNED), MoodPicker (PLANNED)
    │   ├── Layout/          # Unified AppLayout shell
    │   ├── Player/          # FullScreen player, Mini player, MobilePlayerBar (PLANNED), Controls, Progress bar
    │   ├── Playlist/        # Add to playlist modal
    │   └── ui/              # Single source of truth for shadcn UI primitives
    ├── context/             # Firebase AuthContext provider & hooks
    ├── firebase/            # Firebase SDK configuration & Auth helpers
    ├── hooks/               # useInView, useMediaQuery (PLANNED)
    ├── lib/                 # Shared utilities (cn helper)
    ├── pages/               # Page components (Home, Explore, Favorites, Playlists, Help, Landing, NotFound)
    ├── store/               # Zustand state stores (usePlayerStore, usePlaylistStore)
    └── utils/               # YouTube API, recommender, queue generator, keyword extractors
```
