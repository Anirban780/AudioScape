# Track Player Revamp — Implementation Log

> **Branch:** `feature/track-player-revamp`  
> **Base:** `staging`  
> **Started:** August 17, 2026  
> **Status:** In Progress (Track Player Redesign & Volume Engine Completed)

---

## 🎯 Branch Objectives

1. **Dedicated Sidebar State Management**: Extract sidebar collapsed state from `usePlayerStore` into `useSidebarStore`.
2. **Enhanced Player Store**: Add queue management methods (`removeFromQueue`, `reorderQueue`, `addToQueue`, `clearQueue`), `playbackHistory` stack, and `isAutoRefillEnabled` state.
3. **Reusable Audio Hooks**: Create `usePlayerProgress` for polling track time/duration and `useKeyboardShortcuts` for global player keybindings.
4. **Backend Queue Integration**: Replace legacy client-side `generateQueue.js` with NestJS `POST /api/music/generate-queue` and new `POST /api/music/extend-queue` endpoint for continuous radio playback.
5. **Track Players Redesign, Volume Controls & Ultra HD Thumbnail Engine**: Implement Midnight Studio / Aura Lumina styled dual-panel full-screen mode and floating mini-player widget with ambient album art mesh glow, glassmorphic card overlays, neon purple accents, minimal 1:1 circle play button, left-side vertical volume slider with centered handle knob & +/- 5-point step buttons, top-left exit button, clean non-overlapping progress bar, floating queue box container, and Ultra HD (`maxresdefault.jpg`) thumbnail resolution engine.
6. **Interactive Queue System**: Integrate drag handles, swipe/click track removal, unescaped HTML title parsing, and clear queue action in `TrackQueue.jsx`.
7. **App-wide "Add to Queue" Action**: Enable adding tracks to queue from any `MusicCard` component context menu across Home and Explore pages.

---

## 📋 Task Progress Checklist

- [x] **Branch Setup**: Created `feature/track-player-revamp` off `staging`

- [x] **Component 1: Player State & Hooks Refactoring**
  - [x] Create `useSidebarStore.js`
  - [x] Refactor `Sidebar.jsx` & `AppLayout.jsx` to use `useSidebarStore`
  - [x] Update `usePlayerStore.js` with queue management actions & playback history
  - [x] Create `usePlayerProgress.js` hook
  - [x] Create `useKeyboardShortcuts.js` hook

- [x] **Component 2: Backend Queue Extension Endpoint**
  - [x] Add `ExtendQueueDto`
  - [x] Extend `RecommendationsService` with `extendQueue` method & larger initial queues
  - [x] Add `POST /api/music/extend-queue` to `RecommendationsController`

- [x] **Component 3: Frontend API & Queue Integration**
  - [x] Add backend queue helper functions in `api.js`
  - [x] Deprecate `generateQueue.js` local utility
  - [x] Update `PlayerContainer.jsx` to call backend queue API & auto-refill near queue end
  - [x] Fix track completion race condition in `YoutubePlayer.jsx` & `PlayerContainer.jsx`

- [x] **Component 4: Interactive Queue System Overhaul**
  - [x] Overhaul `TrackQueue.jsx` with floating padded box container (`rounded-3xl player-glass-card shadow-2xl`)
  - [x] HTML entity decoding (`decodeHtmlEntities`) for unescaped track title parsing
  - [x] HTML5 drag handles (`GripVertical` icon) for drag-and-drop queue reordering (`reorderQueue`)
  - [x] Per-item `X` removal button on row hover (`removeFromQueue`)
  - [x] Native hover tooltips (`title={cleanTitle}`) displaying full unclipped track names
  - [x] Active row highlight with animated 3-bar equalizer pulse indicator (`animate-eq-*`)
  - [x] Sequential queue list separation into active upcoming tracks (`originalIndex > currentIndex`) and collapsible history section (`originalIndex < currentIndex`)

- [x] **Component 5: Track Players Redesign, Volume Controls & Ultra HD Thumbnail Engine (Merged Pass 4)**
  - [x] **Ambient Mesh Glow & Custom CSS**: Added `animate-ambient-glow`, `animate-eq-*`, `player-glass-card`, and `player-btn-primary-glow` utilities in `index.css`
  - [x] **MiniPlayer Redesign**: Squircle `rounded-3xl` glass container, visual drag handle pill, `usePlayerProgress` hook integration, and queue count badge in `MiniPlayer.jsx`
  - [x] **FullScreenPlayer Dual-Panel View**: Ambient album art mesh glow backdrop, top-left exit `X` button, light/dark theme switcher button, dynamic collapsible sidebar rail (`w-20` <-> `w-60`), and floating queue container box in `FullScreenPlayer.jsx`
  - [x] **Responsive Layout & Viewport Scaling**: Added `max-h-[42vh]` artwork constraints and fixed `div.lg:hidden 1417px` flex height collapse bug by rendering mobile queue drawer in a `fixed inset-0 z-50` overlay
  - [x] **Ultra HD Thumbnail Quality Engine**: Refactored `youtubeUtils.js` to target 1080p/720p HD artwork (`maxresdefault.jpg`) with automatic step-down resolution fallbacks (`maxresdefault` -> `sddefault` -> `hqdefault` -> `mqdefault`)
  - [x] **Restored Left Vertical Volume Rail**: Re-added left-side vertical volume slider (`VolumeBar`) positioned after sidebar rail and before thumbnail (`lg:flex` >= 1024px) with `hideMuteButton={true}`
  - [x] **Centered Volume Bar Handle Knob & +/- Step Buttons**: Positioned white knob along center track line axis using `calc(${displayVolume}% - 10px)` and added `+` / `-` buttons (+/- 5 points per click) in `VolumeBar.jsx`
  - [x] **Pure Mute/Unmute Toggle & Store Sync**: Converted speaker icon button in `PlayerControls.jsx` into a direct Mute/Unmute toggle, with `setVolume` and `toggleMute` actions in `usePlayerStore.js` synchronized directly with YouTube player API (`player.setVolume`, `player.mute`, `player.unMute`)

- [ ] **Component 6: App-wide "Add to Queue" Context Actions**
  - [ ] Add "Add to Queue" context menu action on `MusicCard` components in `frontend/src/components/Home/` & `frontend/src/components/Explore/`
  - [ ] Connect context menu button to `usePlayerStore.addToQueue(track)` action

- [ ] **Component 7: Verification & Responsive QA**
  - [ ] Perform responsive layout QA across breakpoints (375px, 768px, 1024px, 1440px)
  - [ ] Run backend NestJS unit & integration tests (`cd backend && npm test`)
  - [ ] Run frontend Vitest unit tests (`cd frontend && npm test`)
  - [ ] End-to-end manual playback & queue flow verification
