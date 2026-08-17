# Track Player Revamp — Implementation Log

> **Branch:** `feature/track-player-revamp`  
> **Base:** `staging`  
> **Started:** August 17, 2026  
> **Status:** In Progress (Phase 4 / Component 4 Completed)

---

## 🎯 Branch Objectives

1. **Dedicated Sidebar State Management**: Extract sidebar collapsed state from `usePlayerStore` into `useSidebarStore`.
2. **Enhanced Player Store**: Add queue management methods (`removeFromQueue`, `reorderQueue`, `addToQueue`, `clearQueue`), `playbackHistory` stack, and `isAutoRefillEnabled` state.
3. **Reusable Audio Hooks**: Create `usePlayerProgress` for polling track time/duration and `useKeyboardShortcuts` for global player keybindings.
4. **Track Players CSS & Visual Design Upgrade**: Implement Midnight Studio / Aura Lumina styled dual-panel full-screen mode and floating mini-player widget with ambient album art mesh glow, glassmorphic card overlays, neon purple accents, and responsive typography.
5. **Interactive Queue System**: Integrate `@dnd-kit` drag-and-drop reordering, swipe/click track removal, and clear queue action in `TrackQueue.jsx`.
6. **Backend Queue Integration**: Replace legacy client-side `generateQueue.js` with NestJS `POST /api/music/generate-queue` and new `POST /api/music/extend-queue` endpoint for continuous radio playback.
7. **App-wide "Add to Queue" Action**: Enable adding tracks to queue from any `MusicCard` component context menu.

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
- [x] **Component 4: Track Players CSS & Visual Design Upgrade (MiniPlayer & FullScreenPlayer)**
  - [x] Add `animate-ambient-glow`, `animate-eq-*`, `player-glass-card`, and `player-btn-primary-glow` utilities in `index.css`
  - [x] Redesign `MiniPlayer.jsx` with squircle `rounded-3xl` glass container, visual drag handle pill, `usePlayerProgress` hook, and queue badge
  - [x] Redesign `FullScreenPlayer.jsx` with Midnight Studio dual-panel layout, ambient radial mesh background glow, 80px collapsed sidebar rail, integrated `VolumeBar`, and `useKeyboardShortcuts`
  - [x] Update `PlayerControls.jsx` with primary button neon glow
- [ ] **Component 5: Interactive TrackQueue Component V2 (dnd-kit)**
  - [ ] Install `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
  - [ ] Add drag-and-drop reordering in `TrackQueue.jsx`
  - [ ] Add remove track & clear queue actions
  - [ ] Add active track indicator with equalizer animation
- [ ] **Component 6: App-wide "Add to Queue" Context Actions & Final Polish**
  - [ ] Add "Add to Queue" action on `MusicCard` components
  - [ ] Perform responsive QA across breakpoints (375px, 768px, 1024px, 1440px)
- [ ] **Verification & Testing**
  - [ ] Backend NestJS unit & integration tests
  - [ ] Frontend Vitest tests
  - [ ] End-to-End manual testing & responsive QA

---

## 📝 Implementation Execution Log

### Phase 1: Component 1 — Player State & Hooks Refactoring (COMPLETED)

#### 1.1 Created `useSidebarStore.js`
- **Path**: `frontend/src/store/useSidebarStore.js`
- **Purpose**: Decouple global navigation sidebar state from audio player state (`usePlayerStore`), preventing unnecessary player re-renders when expanding or collapsing the navigation rail.
- **Key Methods**:
  - `isSidebarCollapsed`: Persists state in `localStorage` under `audioscape_sidebar_collapsed`.
  - `toggleSidebarCollapsed()`: Toggles state and syncs to `localStorage`.
  - `setSidebarCollapsed(collapsed)`: Setter.

#### 1.2 Updated Sidebar Consumers
- **Files Modified**:
  - `frontend/src/components/Home/Sidebar.jsx`
  - `frontend/src/components/Layout/AppLayout.jsx`
- **Details**: Replaced `usePlayerStore` sidebar selectors with `useSidebarStore`.

#### 1.3 Upgraded `usePlayerStore.js`
- **File Modified**: `frontend/src/store/usePlayerStore.js`
- **Details**:
  - Cleaned up obsolete sidebar state and actions.
  - Added `removeFromQueue(index)`: Removes track at specified index, handling `currentIndex` shift when items before or active are deleted.
  - Added `reorderQueue(fromIndex, toIndex)`: Moves queue items while maintaining current playing track index alignment.
  - Added `addToQueue(track)`: Appends track to queue with toast notification and deduplication check.
  - Added `clearQueue()`: Removes upcoming queued tracks, keeping active track at index 0.
  - Added `playbackHistory` array and `pushToHistory(index)` for shuffle-aware previous track navigation.
  - Added `isAutoRefillEnabled` (default `true`) and `setAutoRefillEnabled(enabled)` for radio continuous playback.

#### 1.4 Created `usePlayerProgress.js`
- **Path**: `frontend/src/hooks/usePlayerProgress.js`
- **Purpose**: Encapsulate YouTube iFrame 1-second progress/duration polling logic.
- **Details**:
  - Polls `player.getCurrentTime()` and `player.getDuration()` every 1000ms.
  - Updates `usePlayerStore` progress and duration state cleanly.
  - Handles cleanup automatically on unmount.

#### 1.5 Created `useKeyboardShortcuts.js`
- **Path**: `frontend/src/hooks/useKeyboardShortcuts.js`
- **Purpose**: Global keyboard accessibility hook for player controls.
- **Details**:
  - `Space`: Toggle play/pause (ignores inputs/textareas/selects).
  - `ArrowRight`: Seek forward 5s (`Shift + ArrowRight`: Next track).
  - `ArrowLeft`: Seek backward 5s (`Shift + ArrowLeft`: Previous track).
  - `KeyM`: Toggle mute.
  - `ArrowUp`: Volume +5%.
  - `ArrowDown`: Volume -5%.
  - `Escape`: Exit fullscreen player view.

---

### Phase 2: Component 2 — Backend Queue Extension Endpoint & Service Upgrade (COMPLETED)

#### 2.1 Created `ExtendQueueDto`
- **Path**: `backend/src/recommendations/dto/extend-queue.dto.ts`
- **Purpose**: Validates payload for `POST /api/music/extend-queue`.
- **Validation**: Accepts `existingTrackIds` (array of strings) and optional `keyword` (string).

#### 2.2 Upgraded `RecommendationsService`
- **Path**: `backend/src/recommendations/recommendations.service.ts`
- **Details**:
  - Upgraded `generateQueue()` mix targets to produce up to ~20 initial tracks (12 related + 7 recent + current).
  - Added `extendQueue(userId, existingTrackIds, keyword)` method:
    - Deduplicates candidate tracks against `existingTrackIds`.
    - Searches using keyword context and/or TF-IDF user recommendations.
    - Returns ~10 fresh candidate tracks to seamlessly append to active queue.

#### 2.3 Exposed `POST /api/music/extend-queue` Endpoint
- **Path**: `backend/src/recommendations/recommendations.controller.ts`
- **Details**:
  - Protected with `GoogleAuthGuard`.
  - Maps `POST /api/music/extend-queue` to `recommendationsService.extendQueue()`.

---

### Phase 3: Component 3 — Frontend API & Queue Integration (COMPLETED)

#### 3.1 Added Backend Queue Client API Helpers
- **File Modified**: `frontend/src/utils/api.js`
- **Details**:
  - Added `generateQueueFromBackend(currentTrackId, keyword)`: Sends `POST /api/music/generate-queue` and normalizes response track schema.
  - Added `extendQueueFromBackend(existingTrackIds, keyword)`: Sends `POST /api/music/extend-queue` for continuous radio playback.

#### 3.2 Deprecated `generateQueue.js` Utility
- **File Modified**: `frontend/src/utils/generateQueue.js`
- **Details**:
  - Transformed client-side queue generator into a wrapper delegating directly to `generateQueueFromBackend`.
  - Guarantees backward compatibility while ensuring server-authoritative queue composition.

#### 3.3 Updated `YoutubePlayer.jsx`
- **File Modified**: `frontend/src/components/Player/YoutubePlayer.jsx`
- **Details**:
  - Added `onTrackEnd` callback prop.
  - Fires `onTrackEnd()` when `event.data === 0` (ENDED), transferring track completion orchestration to `PlayerContainer`.

#### 3.4 Upgraded `PlayerContainer.jsx`
- **File Modified**: `frontend/src/components/Player/PlayerContainer.jsx`
- **Details**:
  - **Server-Authoritative Queue**: Replaced legacy client queue builder with `generateQueueFromBackend(track.id, keyword)`.
  - **Radio Auto-Refill**: Added side-effect that monitors `currentIndex >= queue.length - 2`. When near end, triggers `extendQueueFromBackend(existingTrackIds, keyword)` and appends 10 fresh non-duplicate tracks to Zustand store queue.
  - **Eliminated Race Condition**: Removed 1-second `setInterval` polling for player state `0`. Track completion is now driven by `onTrackEnd` callback prop passed to `YoutubePlayer`.

---

### Phase 4: Component 4 — Track Players CSS & Visual Design Upgrade (COMPLETED)

#### 4.1 Added Player CSS Animations & Glassmorphism Utilities
- **File Modified**: `frontend/src/index.css`
- **Details**:
  - Added `@keyframes ambientGlowPulse` and `.animate-ambient-glow` class for breathing radial mesh gradient backdrops.
  - Added `@keyframes eqBarPulse*` and `.animate-eq-*` classes for animated 3-bar equalizer playback indicators.
  - Added `.player-glass-card` for multi-layer frosted glass card depth with `backdrop-blur-xl`.
  - Added `.player-btn-primary-glow` for primary purple button neon glow.

#### 4.2 Redesigned `MiniPlayer.jsx`
- **File Modified**: `frontend/src/components/Player/MiniPlayer.jsx`
- **Details**:
  - **Glassmorphic Squircle Widget**: Upgraded container with `rounded-3xl player-glass-card border border-[var(--color-border-strong)]`.
  - **Visual Drag Handle Bar**: Added a sleek visual handle bar (`mini-player-header`) with `cursor: move` and drag indicator pill.
  - **Progress & FireStore Like Fix**: Integrated `usePlayerProgress` hook and fixed `toggleLike` persistence.
  - **Queue Count Badge**: Added a dynamic track counter badge to the expand button.

#### 4.3 Redesigned `FullScreenPlayer.jsx`
- **File Modified**: `frontend/src/components/Player/FullScreenPlayer.jsx`
- **Details**:
  - **Dual-Panel Architecture (Desktop >= 1024px)**: 60% Left Stage for artwork/controls, 40% Right Stage for permanent integrated `TrackQueue` side panel.
  - **Ambient Mesh Glow Backdrop**: Added layered radial mesh gradient behind album art (`animate-ambient-glow`).
  - **Collapsed Sidebar Rail**: Added compact 80px sidebar rail (`Sidebar isCollapsed={true}`) on desktop.
  - **Integrated VolumeBar & Hotkeys**: Added `VolumeBar.jsx` slider and `useKeyboardShortcuts()` hook.

#### 4.4 Upgraded `PlayerControls.jsx`
- **File Modified**: `frontend/src/components/Player/PlayerControls.jsx`
- **Details**: Added `player-btn-primary-glow` active pulse on the primary play/pause button when audio is active.
