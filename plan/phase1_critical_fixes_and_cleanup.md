# Implementation Plan - Phase 1: Critical Bug Fixes & Codebase Cleanup

This document outlines the implementation plan for Phase 1 of the AudioScape codebase modernization.

---

## 1. Dependency Audit & Package Cleanup

### Root `package.json` Cleanup
- Remove backend-only dependencies from the root `package.json`: `express`, `cors`, `express-rate-limit`, `python-shell`, `textarea`, `openai`, `natural`, `stemmer`, `dotenv`.
- Remove legacy duplicate AI SDK `@google/generative-ai` in favor of `@google/genai`.

---

## 2. Backend Security & Auth Hardening

### [NEW] `backend/middleware/auth.js`
- Implement `verifyToken` middleware that validates incoming `Bearer` Firebase ID tokens using `admin.auth().verifyIdToken()`.

### [MODIFY] `backend/controllers/recommendationController.js`
- Protect `POST /api/music/recommend` with `verifyToken`.
- Use authenticated `req.user.uid` instead of unauthenticated `req.body.userId`.

### [MODIFY] `backend/controllers/trackController.js`
- Protect `POST /api/music/cache-related-tracks` with `verifyToken`.

### [MODIFY] `backend/routes/validateKeywords.js`
- Protect `POST /api/extractKeywords` with `verifyToken` and `express-rate-limit`.
- Sanitize input history to eliminate prompt injection risks.

---

## 3. Core Algorithm Bug Fixes

### [MODIFY] `backend/services/recommendService.js`
- Fix line 7 call signature: pass `Date.now()` as `currentTimestamp` before `topN`:
  `recommendSongs(userHistory, relatedTracks, Date.now(), topN)`

---

## 4. Client-Side API Key Security

### [MODIFY] `frontend/utils/youtube.js` & `frontend/pages/ExplorePage.jsx`
- Remove direct client-side usage of `import.meta.env.VITE_YOUTUBE_API_KEY`.
- Proxy all YouTube Data API calls through backend `/youtube` routes.

---

## 5. Firestore N+1 Query & Performance Optimization

### [MODIFY] `frontend/utils/api.js` & `frontend/utils/playlists.js`
- Replace full collection scans (`getDocs`) with targeted Firestore queries (`query(..., where(...))`).

---

## 6. Layout Shell Refactoring

### [NEW] `frontend/components/Layout/AppLayout.jsx`
- Create shared `AppLayout` component for Sidebar, TopNavbar, Drawer, and Theme toggles.

### [MODIFY] `frontend/pages/Home.jsx`, `frontend/pages/ExplorePage.jsx`, `frontend/pages/FavoritesPage.jsx`, `frontend/pages/PlaylistsPage.jsx`
- Wrap page contents in `<AppLayout>`.

---

## 7. Dead & Stale Code Cleanup

### [DELETE] `frontend/components/MusicPlayer.jsx`
- Remove unused legacy player component.

### [DELETE] `frontend/pages/ProfilePage.jsx`
- Remove stale localStorage-based profile page.

---

## Verification Plan

### Automated Build & Syntax Checks
- Run `npm run build` at root level.
- Run `node --check` on updated backend controllers.

### Manual Verification
1. Test unauthenticated vs authenticated access on `/api/music/recommend` and `/api/music/cache-related-tracks`.
2. Confirm recommendation algorithm recency calculations work with `Date.now()`.
3. Verify Firestore query filtering in browser dev tools.
4. Verify page navigation across `AppLayout`.
