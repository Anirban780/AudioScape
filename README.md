# 🎧 AudioScape

> **A next-generation music streaming web application.**  
> Stream music from YouTube, discover new tracks with AI-powered recommendations, manage playlists, and enjoy a cinematic fullscreen player — all in one elegant interface.

[![Version](https://img.shields.io/badge/Release-v2.0.0-6D28D9?style=for-the-badge)](https://github.com/Anirban780/AudioScape/releases/tag/v2.0.0)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite%206-61DAFB?style=for-the-badge&logo=react)](https://vitejs.dev)
[![Backend](https://img.shields.io/badge/Backend-NestJS%2010-E0234E?style=for-the-badge&logo=nestjs)](https://nestjs.com)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20(Neon)-00E599?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## 📖 Table of Contents

1. [Overview](#-overview)
2. [Features at a Glance](#-features-at-a-glance)
3. [Pages & Experience](#-pages--experience)
4. [Music Player](#-music-player)
5. [Search System](#-search-system)
6. [AI Recommendations](#-ai-recommendations)
7. [YouTube API Quota Management](#-youtube-api-quota-management)
8. [Authentication & Security](#-authentication--security)
9. [Design System & Theming](#-design-system--theming)
10. [What's New in v2.0.0](#-whats-new-in-v200)
11. [Tech Stack](#-tech-stack)
12. [Getting Started](#-getting-started)
13. [Contributing](#-contributing)
14. [License](#-license)
15. [Contact](#-contact)

---

## 🌟 Overview

AudioScape is a **full-stack music streaming platform** that lets you listen to any music available on YouTube — without ads, distractions, or copyright violations — in a beautifully designed interface. It started as a simple YouTube player built on Express and Firebase, and has been completely rebuilt from the ground up into a production-grade application with a modern NestJS backend, PostgreSQL database, and a React 19 frontend with a custom design system.

Every aspect of the platform — from the cinematic fullscreen player to the AI-powered recommendation engine — has been engineered to provide a premium listening experience while being respectful of YouTube's API limits and compliant with YouTube's Terms of Service.

---

## 🎯 Features at a Glance

| | |
|---|---|
| 🎵 **Unlimited Music Library** | Stream any song, live performance, remix, or cover available on YouTube — millions of tracks |
| 🤖 **AI-Powered Recommendations** | A TF-IDF content analysis engine learns your taste and suggests new music at zero API cost |
| 🔍 **3-Tier Smart Search** | Results come from local cache first, then database fuzzy search, and YouTube API only as a last resort |
| 📺 **Cinematic Fullscreen Player** | An immersive player with album art, sliding titles, and floating controls — the default listening experience |
| 🎵 **Custom Playlists** | Create unlimited playlists with drag-and-drop reordering and auto-generated mosaic cover art |
| 📜 **Rich Listening History** | Every song you play is logged with play counts, liked status, and timestamps — with hero banners and vinyl cards |
| ❤️ **Favorites Collection** | All your liked songs in one page with sorting, filtering, and animated vinyl card visuals |
| 🔑 **Dual API Key Rotation** | Two YouTube API keys auto-switch to double the daily budget and ensure uninterrupted service |
| 📊 **Live Quota Dashboard** | See real-time YouTube API usage and a countdown timer to the daily reset — synced to your timezone |
| 🛡️ **Secure Authentication** | Google OAuth 2.0 with silent token refresh — you stay logged in seamlessly |
| 🌗 **Tri-State Theming** | Light, Dark, or System (auto-sync with your OS) — all with a custom design system |
| 💬 **Built-in Help & Feedback** | Searchable FAQ center and a feedback form that emails the developer directly |
| 🔔 **Smart Notifications** | Physics-based stacked toast messages with undo support for destructive actions |
| 📱 **Responsive Design** | Looks and works great on desktop and mobile devices |

---

## 📱 Pages & Experience

### 🏠 Home Dashboard

The central hub when you sign in — a rich, personalized discovery dashboard:

- **Spotlight Hero Banner** — An auto-cycling banner showcasing featured artwork with silky crossfade transitions and smooth zoom animations.
- **Daily Mix Cards** — Personalized mix suggestions generated from your listening habits. Each mix groups tracks by genre keywords (e.g., "Mix: Lo-fi", "Mix: K-pop"). One click starts the entire mix as a playlist.
- **Recently Played** — Your last played track with a one-click Resume button, plus a compact list of your latest 7 songs. Links to the full History page.
- **AI Recommendations** — A curated grid of tracks the AI engine thinks you'll enjoy, with a featured spotlight card and staggered layout. Works even for brand-new users through a 4-tier fallback system.
- **Favorite Songs** — Your most-liked songs displayed as animated vinyl cards that spin on hover, with rank badges (#1, #2, etc.) and scroll buttons.
- **Genre Category Slider** — A horizontal carousel of 10 personalized genre realms (Lo-fi, Synthwave, Phonk, Pop Hits, etc.). Each card shows dynamic artwork from the category's top track. The selection is personalized: 60% of categories are chosen based on your listening habits, and 40% are discovery picks to help you explore new genres.

---

### 🔍 Explore & Category Pages

Discover new music across curated genres:

- **Genre Category Slider** on the Home page links to dedicated **Category Detail Pages** at `/category/:slug`.
- Each category page features a **hero banner** with slow-panning artwork from the top tracks, quick-play actions (Play All, Shuffle, Play Track, Add to Playlist), and a **6-second auto-advancing spotlight** cycling through the top 5 songs.
- Switch between **Grid view** (album art cards with ambient glow) and **List view** (compact rows).
- **In-category live search** to filter tracks by title or artist.
- **Progressive pagination** — "Load More Tracks" appends 20 tracks at a time, all served from the local database at zero YouTube API cost.
- 10 curated genre categories include Lo-fi & Chill, Synthwave, Phonk, Pop Hits, Chill Beats, Indie Rock, Workout Energy, Jazz & Soul, Ambient Focus, and Rock Classics.
- Category data uses a **differentiated caching strategy** — curated genres are cached for 15 days and user searches for 7 days, ensuring instant loading with minimal API usage.

---

### 📜 Listening History

A dedicated page (`/history`) that shows every song you've ever played:

- **Hero Banner** — Animated 3D rotating artwork stack cycling your latest 3 tracks every 5 seconds, with a violet gradient title "Listen Again", Play All and Shuffle buttons, and listening statistics.
- **Powerful Sorting & Filtering** — Sort by recently played, most played, title A-Z, or artist A-Z, in either direction. Search your history in real time. Toggle between grid and list views.
- **Vinyl Cards** — Each track is rendered as an album sleeve with a spinning vinyl disc on hover, rank badges, like toggle, and Add to Playlist action — all in a violet accent theme.
- **Smart Pagination** — Page numbers with ellipsis windowing, a "Go to page" input, and rank continuity across pages (Page 2 starts at #51, not #1).
- **Auto-Refresh** — When you play a new song or like a track elsewhere, the history page updates itself silently in the background (with a 5-second debounce to batch rapid actions).

---

### ❤️ Favorites

All the songs you've liked, presented with the same premium design as the History page:

- Rose/pink accent themed vinyl cards with rank badges and spinning hover animations.
- Hero banner with animated artwork stack and quick-play actions.
- Multi-mode sorting: Most Played, Last Added, Title A-Z, Artist A-Z.
- Discover-style pagination with continuous ranking across pages.
- Optimistic unlike with undo toast — unlike a track and it disappears instantly with an "Undo" button for 6 seconds.

---

### 🎵 Playlists

Create and manage personal music collections:

- **Mosaic Cover Art** — Playlist covers are automatically generated as a Spotify-style 2×2 grid from the first 4 track thumbnails. Falls back to a single thumbnail if fewer than 4 tracks, or a gradient stub if empty.
- **Create & Delete Playlists** — Named playlists with instant creation via a glassmorphic modal with character counters.
- **Drag-and-Drop Reordering** — Rearrange tracks within a playlist by dragging them — changes are synced to the server.
- **Playlist Detail Page** — Full-width blurred artwork hero, Play All and Shuffle actions, in-playlist search, and custom sort orders.
- **Interactive Spotlight Dock** — A quick-switch panel showing 3 contextual picks: your most recent playlist, your largest playlist, and a random mix — each with a 1-click play button.
- **3D Card Conveyor** — An animated 3-card stack in the hero section that auto-rotates with smooth GPU-accelerated transitions and thumbnail deduplication.
- **Add from Anywhere** — Every track card across the entire app has an "Add to Playlist" button. A membership check instantly shows which playlists already contain the track.
- **Smart Duplicate Warning** — If you try to add a song already in a playlist, an alert banner tells you it's already there.

---

### 🏠 Landing Page

The public entry point for visitors who haven't signed in:

- Product marketing with feature highlights explaining what AudioScape offers.
- Google One-Tap sign-in for returning users (auto-login prompt).
- Standard Google sign-in button for new users.
- 5-second auto-sliding product showcase carousel.
- Feature grid with hover pop-out animations explaining "Why AudioScape?".
- Theme toggle available even before signing in.
- 4-column branded footer with navigation, library links, and social connections.

---

### 💬 Help & Feedback Center

A built-in support hub accessible from the footer:

- **12 Frequently Asked Questions** covering playback, YouTube search quotas, cached searches, playlist management, Google account sync, background play, audio quality, themes, keyboard shortcuts, and more.
- **6 Category Filter Chips** — All Topics, Playback & Sound, Search & Quota, Library & Playlists, Account & Sync, and Tips & Shortcuts.
- **Real-Time Search** — Type to instantly filter FAQ questions and answers.
- **Feedback Form** — Choose a category (Bug Report, Feature Idea, Audio & Quality, Search & Quota, General Feedback), give a 5-star rating with hover descriptions (Needs Work → Love It!), and write your message.
- **Identity Pre-Fill** — If you're signed in, your name and email are auto-filled with a verified badge.
- **Device Diagnostics** — Optionally include your browser, OS, screen resolution, and currently playing track to help with bug reports.
- **Direct Email Delivery** — Your feedback is formatted into a professional, branded HTML email and sent directly to the developer. The developer can click "Reply" in their mail client to respond to you.
- **Celebration Animation** — After submission, you see an animated receipt confirming your feedback was received.
- **Rate Limiting** — Max 5 submissions per 10 minutes to prevent spam.

---

## 🎧 Music Player

AudioScape offers two player modes, switchable from the sidebar:

### Fullscreen Player (Default)

When you play a song, the fullscreen player launches automatically — an immersive, cinematic experience:

- Large album artwork with proper aspect ratio constraints.
- **Smart Sliding Title** — Short titles display statically. Long titles gently slide vertically with 3.5-second reading pauses at each boundary, with gradient edge masks. Extremely long titles switch to a horizontal marquee. Hovering pauses the animation.
- Floating corner controls — a minimize button and theme switcher in the top-left, mobile queue drawer toggle in the top-right.
- Full playback controls, progress bar, volume control, and a scrollable queue drawer on the right panel.
- Press `Esc` to minimize to the mini player.

### Mini Player (Compact)

A compact player bar at the bottom of the screen for when you want to browse while listening:

- Four layout styles available: floating, slim, docked, and corner.
- Fixed thumbnail size with strict text truncation — no visual overflow.
- Expand button to return to the fullscreen player.

### Player Mode Toggle

- **Expanded sidebar:** A segmented `[ Full | Mini ]` pill toggle with your preferred default highlighted.
- **Collapsed sidebar:** A compact icon button with hover tooltip.
- Your preference is saved and persists between sessions.

### Playback Features

- **Queue Management** — View your full queue with numbered tracks, see what's playing now (with an animated equalizer), what you've already heard, and what's up next. Clear the queue with an undo option.
- **1-Click Station Streaming** — Click "Play Station" on any genre section to queue all 20 tracks for continuous playback. Shuffle randomizes the order.
- **Playback Source Attribution** — The system tracks where each song was played from (Search, Explore, Recommendation, Playlist, or Queue) to improve future recommendations.
- **Buffering Watchdog** — If a track takes more than 9 seconds to load, the player automatically shows an alert and skips to the next song.
- **Pause/Resume Deduplication** — Play counts are logged only once per track session, so pausing and resuming doesn't inflate your listening stats.
- **Song Change Notification** — The fullscreen player shows a brief, dismissible notification when the track changes.

---

## 🔍 Search System

AudioScape's search is built around a **3-tier pipeline** designed to minimize YouTube API usage while delivering fast results:

| Tier | What Happens | API Cost |
|---|---|---|
| **1. Page Cache** | If anyone has searched for the same query before, results come from the database instantly | **Free** |
| **2. Database Fuzzy Search** | If no exact cache match, AudioScape searches its own track database using PostgreSQL full-text search with typo-tolerant fuzzy matching | **Free** |
| **3. YouTube API** | Only when neither local source has results does AudioScape query YouTube. Results are then cached for 24 hours | **100 units** |

Additional search features:
- **50 tracks per API call** — When YouTube is queried, AudioScape fetches the maximum 50 results per call (at the same quota cost as fetching 10), building a deep local catalog over time.
- **Transactional cache writes** — YouTube results are saved atomically. If something goes wrong mid-save, nothing is partially written (preventing corrupt cache entries).
- **Automated cleanup** — Expired and low-value search caches are cleaned up on a daily schedule, keeping the database lean.
- **Resumable backfilling** — Categories can be progressively enriched across multiple API calls using pagination tokens.

---

## 🤖 AI Recommendations

AudioScape uses a content-based AI technique called **TF-IDF** (Term Frequency–Inverse Document Frequency) to power its recommendation engine — at zero YouTube API cost:

### How It Works

1. The engine analyzes the titles, genres, tags, and metadata of songs you've listened to.
2. It builds a profile of your musical taste using three weighted signals:
   - **Artist Affinity (60%)** — Your top 10 most-played artists, with a cap to prevent any single artist from dominating.
   - **Genre & Tag Matching (25%)** — Overlap between your listening patterns and available tracks.
   - **Search History (15%)** — What you've searched for, weighted by recency.
3. Tracks are scored, ranked, and returned as personalized recommendations.

### Smart Discovery Balance

Each recommendation set follows an **80/20 ratio**:
- **80% Fresh Discoveries** — Songs you haven't heard or have barely played.
- **20% Rediscoveries** — Tracks you've played before but might want to revisit (played ≤2 times or not heard in 14+ days).

Rediscovery tracks are evenly spaced through the results so the mix feels natural.

### 4-Tier Fallback Guarantee

Recommendations always appear, even for brand-new users:

1. Your personal TF-IDF recommendations (if you have listening history).
2. Globally popular tracks across the platform.
3. Curated keyword-based picks.
4. Static default genre showcases.

### Dedicated Recommendations Page

A full `/recommendations` page with:
- "Play All" and "Shuffle Mix" buttons.
- Filter chips to toggle between All, Fresh, and Rediscovery tracks.
- Instant refresh to regenerate recommendations.
- Pagination with the 80/20 ratio guaranteed on every page.

---

## 📊 YouTube API Quota Management

YouTube gives 10,000 free API units per key per day. AudioScape uses two keys (20,000 units total) and manages them carefully:

### Dual Key Rotation

- Two YouTube API keys from separate Google Cloud projects alternate daily — odd days start on Key A, even days on Key B.
- When the active key approaches 8,000 units used, the system automatically switches to the backup key.
- The remaining 2,000 units per key serve as an emergency buffer for background metadata refreshes.
- If both keys are exhausted, the app seamlessly falls back to serving results from the local database only — it never crashes.

### Daily Budget Allocation

| Budget | Units | Purpose |
|---|---|---|
| User searches | 15,000 | Direct search queries |
| Metadata & categories | 3,000 | Track enrichment and explore cache |
| Emergency buffer | 2,000 | Background 30-day metadata refresh |

### Dynamic Rate Limiting

- **Below 50% usage** (< 7,500 units / < 75 searches) — Everyone searches freely with no restrictions.
- **Above 50% usage** — Each user is limited to 5 searches per day, so the remaining budget lasts for everyone.
- Reset is aligned to your local timezone midnight (not UTC).

### Live Quota Dashboard

A small pill indicator in the header shows:
- Current usage level and daily budget breakdown.
- A two-line countdown timer: "Reset tonight at: 12:00 AM" with a live `HH:MM:SS` countdown.
- Non-intrusive — doesn't block scrolling or playback.

### YouTube Terms of Service Compliance

- **30-Day Metadata Refresh** — YouTube requires stored metadata to be refreshed or deleted within 30 days. A daily automated job refreshes stale track data in efficient batches of 50, marking deleted or private videos as unavailable.
- **No Audio Extraction** — AudioScape streams exclusively through YouTube's official embedded IFrame API.
- **No Client-Side API Keys** — All YouTube API keys are kept strictly on the server and never exposed to the browser.

---

## 🛡️ Authentication & Security

### Google OAuth 2.0

- Sign in with your Google account using **Google One-Tap** (auto-login for returning users) or the standard Google sign-in button.
- AudioScape verifies your identity directly through Google's servers — no passwords are stored.
- A short-lived access token (15 minutes) handles API requests, while a long-lived refresh token (7 days) is stored in a secure HTTP-only cookie.
- **Silent refresh** runs proactively before the access token expires, so you stay logged in without interruption.
- On page reload, a startup authentication check runs instantly — showing a branded splash screen instead of flashing the login page.

### Security Measures

- **GDPR/CCPA Account Deletion** — A dedicated endpoint allows you to delete your account and all associated data (history, playlists, favorites) in one action.
- **Security Headers** — Strict OWASP-recommended headers including content type protection, frame guard, XSS protection, and content security policy.
- **Timing-Safe Cron Authentication** — Background maintenance jobs are protected by cryptographic secret verification, preventing unauthorized quota consumption.
- **CORS Protection** — Only explicitly whitelisted domains can communicate with the backend — no wildcard subdomain access.
- **Scoped Cookies** — Refresh tokens are scoped strictly to auth endpoints, not sent on every request.

---

## 🎨 Design System & Theming

AudioScape uses a custom design system with two carefully crafted themes:

### Midnight Studio (Dark Mode)
A deep, cinematic dark theme with rich contrast — deep navy backgrounds, violet/purple primary accents, pink secondary highlights, and refined border contrast.

### Aura Lumina (Light Mode)
A clean, modern light theme with warm tones and carefully balanced contrast ratios.

### Design Principles
- **Zero-Green Policy** — Green is strictly eliminated from the palette. The brand colors are Purple (#A78BFA), Pink (#EC4899), and Blue (#2563EB) — plus White and Black.
- **Custom Typography** — Outfit for display headings and Plus Jakarta Sans for body text.
- **Glassmorphism** — Frosted glass effects with backdrop blur on modals, popovers, and surface cards.
- **Micro-Animations** — Hover lifts, image zooms, ambient glows, spinning vinyl discs, Ken Burns zoom on hero banners, and smooth crossfade transitions.
- **Smart Notifications** — Sonner-powered physics-based toast messages that stack, animate, and support undo actions (6-second window for destructive operations like unlike or queue clear).
- **Auto-Refresh System** — When you like a song, play a new track, or make changes, all related UI sections silently refresh in the background with a 5-second debounce — no manual page reload needed.

### Tri-State Theme Toggle
- **Light** — Forces light mode.
- **Dark** — Forces dark mode.
- **System** — Syncs with your operating system preference and reacts in real-time when you change it.

---

## 🆕 What's New in v2.0.0

Version 2.0.0 represents the complete transformation of AudioScape from a basic Express + Firebase player into a full-stack production platform. Here are the major milestones:

### Complete Backend Rebuild
- Migrated from Express.js to **NestJS 10** with a modular TypeScript architecture.
- Migrated from Firebase Firestore to **PostgreSQL** (Neon Serverless) with **Prisma ORM**.
- Built a resilient database layer with automatic failover between cloud and local databases.

### Complete Frontend Rebuild
- Rebuilt the entire frontend with **React 19**, **Vite 6**, and **Tailwind CSS v4**.
- Implemented the Midnight Studio & Aura Lumina design system with full token architecture.
- Consolidated all components under a unified layout shell with glassmorphic navigation.

### Authentication Overhaul
- Replaced Firebase Authentication with **direct Google OAuth 2.0** using Google Identity Services.
- Implemented stateless JWT sessions with silent refresh and HTTP-only secure cookies.
- Removed the entire Firebase SDK dependency (~100KB bundle savings).

### Music Discovery & Recommendations
- Built a **TF-IDF recommendation engine** running entirely on PostgreSQL — zero external API cost.
- Implemented multi-signal scoring (artist affinity, genre matching, search history) with 80/20 discovery balance.
- Created the 60/40 personalized category slider for the Home page.
- Fixed critical recommendation bugs — timestamp calculation errors, ingestion metadata loss, and the "already cached" trap that left tracks permanently un-enriched.

### Search & Caching Architecture
- Built the 3-tier search pipeline with PostgreSQL full-text search and GIN trigram indexes.
- Implemented 24-hour search result caching with transactional integrity.
- Added automated garbage collection for expired caches.
- Increased YouTube API results from 10 to 50 per call at the same quota cost.

### Page-by-Page Redesign
- **Home Dashboard** — 5-module layout with hero banner, daily mixes, recently played, recommendations, and favorites.
- **Explore → Category Pages** — Replaced 12 vertical genre stacks with a horizontal carousel linking to dedicated category detail pages.
- **Listening History** — Dedicated `/history` page with hero banner, vinyl cards, multi-sort, and smart pagination.
- **Favorites** — Full redesign with rose-themed vinyl cards, hero banner, and optimistic unlike with undo.
- **Playlists** — Mosaic cover art, drag-and-drop reordering, 3D spotlight conveyor, membership checking, and universal "Add to Playlist" across the app.
- **Landing Page** — Product marketing, Google One-Tap, and feature showcase.

### Player System
- Built a cinematic fullscreen player as the default mode with smart sliding titles.
- Created a compact mini player with 4 layout styles.
- Added a sidebar player mode toggle with preference persistence.
- Implemented the 9-second buffering watchdog with auto-skip.
- Fixed play count inflation on pause/resume.

### Platform Infrastructure
- **YouTube Quota Telemetry** — Live dashboard with dynamic rate limiting and timezone-aware reset countdown.
- **Dual API Key Rotation** — Two keys with automatic failover at the 8,000-unit threshold.
- **30-Day Metadata Refresh** — Automated compliance with YouTube's data freshness requirements.
- **Notification System** — Migrated to Sonner with physics animations, stacked toasts, and undo actions.
- **Help & Feedback Center** — 12-topic FAQ, feedback form, and HTML email delivery via Nodemailer.
- **Data Auto-Refresh** — Silent background revalidation across all sections when data changes.
- **Security Hardening** — GDPR account deletion, OWASP headers, timing-safe cron auth, scoped cookies, and anchored CORS.
- **Dynamic Browser Tab** — Shows `▶ Song • Artist | AudioScape` during playback.
- **Universal Thumbnail Failsafe** — Multi-tier resolution cascade with gray dummy image detection, ensuring album art always loads correctly.

### Deployment & Operations
- **Vercel** frontend with global edge CDN, SPA routing, and immutable asset caching.
- **Render** backend with automated builds from Git, zero cold-start prevention via 12-minute health pings.
- **Neon** PostgreSQL with staging/production database branching and connection pooling.
- **Database Maintenance** — Daily cleanup of expired search caches and monthly quota log trimming.

---

## 🛠 Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| **React 19** | User interface framework with concurrent rendering |
| **Vite 6** | Fast build tool and development server |
| **Tailwind CSS v4** | Utility-first styling with custom design tokens |
| **Zustand** | Lightweight global state management |
| **React Router v7** | Page routing with protected route guards |
| **Sonner** | Physics-based toast notifications with undo support |
| **@dnd-kit** | Drag-and-drop toolkit for playlist reordering |
| **YouTube IFrame API** | Embedded YouTube player for audio streaming |
| **Google Identity Services** | Google One-Tap and OAuth sign-in |

### Backend

| Technology | Purpose |
|---|---|
| **NestJS 10** | Modular TypeScript server framework |
| **Node.js 22** | JavaScript runtime |
| **Prisma ORM 7** | Type-safe database access with migrations |
| **PostgreSQL 16** | Relational database with full-text search |
| **natural (npm)** | TF-IDF text similarity engine for recommendations |
| **Nodemailer** | Email delivery for feedback submissions |
| **Passport.js** | Authentication strategy framework |
| **@nestjs/schedule** | Cron job scheduler for maintenance tasks |

### Infrastructure

| Service | Purpose |
|---|---|
| **Vercel** | Frontend hosting with global edge CDN |
| **Render** | Backend hosting with auto-deploy from Git |
| **Neon** | Serverless PostgreSQL with database branching (staging/production) |
| **Google Cloud** | YouTube Data API v3 (2 projects × 10K units/day) |
| **cron-job.org** | External health pinger preventing cold starts (every 12 min) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js v22** or higher
- **npm** or **pnpm**
- A **PostgreSQL** database (local, or a free [Neon](https://neon.tech) account)
- A **Google Cloud** project with YouTube Data API v3 enabled
- A **Google OAuth 2.0** Client ID

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

### 3. Configure Environment

Create `.env` files in both `frontend/` and `backend/` with your API keys, database connection strings, and authentication credentials. Refer to the `.env.example` files for the complete list of required variables.

### 4. Set Up the Database

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

### 5. Start the Application

```bash
# Terminal 1 — Backend (runs on port 5000)
cd backend && npm run start:dev

# Terminal 2 — Frontend (runs on port 5173)
cd frontend && npm run dev
```

### Docker (Alternative)

A full Docker Compose setup is included for local development:

```bash
docker compose up --build
```

This starts the frontend, backend, and a local PostgreSQL database together.

---

## 🤝 Contributing

1. Fork the repository
2. Create a branch from `staging`: `git checkout -b feat/your-feature staging`
3. Commit using conventional commit messages: `feat: add new feature`
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

**AudioScape v2.0.0** — Built with passion using React, NestJS, and PostgreSQL

*Stream boldly. Discover deeply.*

</div>
