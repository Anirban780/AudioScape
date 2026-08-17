# AudioScape Git Branching & Release Management Guide

This document defines the exact Git branching strategy, environment promotion pipeline, release tagging standard, and step-by-step developer workflows for AudioScape during the database migration and NestJS backend rewrite.

---

## 1. Branch Hierarchy Overview

```
                      [feature/*] or [migration/*]
                                   │
                                   ▼  (PR & Squash Merge)
                             [staging]   ───────► Deploys to Staging Environment
                                   │              (Vercel Staging + Render Staging + Neon Staging)
                                   │
                                   ▼  (Pre-Production Testing & Verification)
                                [main]   ───────► Deploys to Production Environment
                                   │              (Vercel Production + Render Production + Neon Prod)
                                   │
                            (Release Tag)
                                   ▼
                             [v2.0.0 Tag]
```

### Persistent Branches
* **`main`**: Production-ready code only. Automatically deploys to live production services (Vercel Client & Render Backend). Direct commits are **strictly forbidden**.
* **`staging`**: Pre-production integration branch. Deploys automatically to staging instances (Vercel Staging & Render Staging). All new features and migration code are integrated and validated here first.
* **`archive/v.1.x.x-express-firebase`**: Archived branch snapshot containing the legacy Express/Firestore implementation for reference or rollback needs.

### Ephemeral Development Branches
* **`migration/<topic>`**: Used for database schema, backfill scripts, and database layer changes (e.g., `migration/neon-prisma-schema`, `migration/firestore-backfill`).
* **`feature/<topic>`**: Used for backend NestJS modules and frontend UI cleanups (e.g., `feature/nestjs-auth-guard`, `feature/appshell-layout`).
* **`bugfix/<topic>`**: Used to fix issues discovered during testing on the `staging` branch.
* **`hotfix/<topic>`**: Used only for urgent production fixes branching off `main`.

---

## 2. Step-by-Step Setup & Workflow Guide

### Step 2.1: Initialize the `staging` Branch
If `staging` does not exist yet on remote, initialize it from your current baseline:
```bash
# Ensure you are on main and up to date
git checkout main
git pull origin main

# Create staging branch from main and push to GitHub
git checkout -b staging
git push -u origin staging
```

---

### Step 2.2: Working on a Feature or Migration
Always branch off the `staging` branch when building new features or working on the backend rewrite.

```bash
# 1. Start from updated staging
git checkout staging
git pull origin staging

# 2. Create your working branch (e.g. for Prisma & Neon setup)
git checkout -b migration/neon-prisma-setup

# 3. Make changes, commit logically
git add .
git commit -m "feat(database): configure Prisma schema and Neon PostgreSQL connection"

# 4. Push working branch to GitHub
git push -u origin migration/neon-prisma-setup
```

---

### Step 2.3: Merging into `staging` (Pre-Production)
1. Open a Pull Request (PR) on GitHub:
   * **Base branch**: `staging`
   * **Compare branch**: `migration/neon-prisma-setup`
2. Run local build checks before merging:
   ```bash
   # Verify frontend build
   npm run build
   ```
3. Merge using **Squash and Merge** on GitHub to keep history clean.
4. **Automatic Staging Deployment**: Vercel and Render will trigger preview/staging deployments linked to the `staging` branch.

---

### Step 2.4: Pre-Production Verification on Staging
Before promoting code to `main`, verify the staging environment:
* [ ] Database migrations execute cleanly on the Staging Neon DB instance (`npx prisma migrate deploy`).
* [ ] Render Staging NestJS server boots up and responds to `/healthcheck`.
* [ ] Client ping flow correctly wakes up the staging backend without crashing connection pools.
* [ ] All critical API routes (Auth, Tracks, Playlists, Recommendations) pass manual/e2e integration checks.

---

### Step 2.5: Promoting Staging to Production (`main`) & Release Tagging
Once the `staging` branch is 100% verified, promote it to `main` and tag the release.

```bash
# 1. Open PR on GitHub: Base: main <--- Compare: staging
# 2. After PR approval, merge staging into main (Use Create a Merge Commit or Rebase)

# 3. Pull latest main to your local environment
git checkout main
git pull origin main

# 4. Tag the new release (SemVer format)
git tag -a v2.0.0 -m "Release v2.0.0: NestJS backend rewrite, Neon PostgreSQL migration, and secured API"

# 5. Push tags to GitHub
git push origin v2.0.0
```

---

## 3. Semantic Versioning & Release Tag Strategy

We follow Semantic Versioning (`vMAJOR.MINOR.PATCH`):

| Version | Scope | Examples |
|---|---|---|
| **`v1.0.0`** / **`archive/v.1.x.x-*`** | Legacy baseline | Express + Firestore + Raw YouTube client calls |
| **`v2.0.0-alpha.x`** | Milestone previews during rewrite | `v2.0.0-alpha.1` (Prisma schema ready), `v2.0.0-alpha.2` (NestJS Auth ready) |
| **`v2.0.0`** | Complete Phase 2 & 3 Migration | Full NestJS rewrite + Neon DB live + Vercel/Render pipeline active |
| **`v2.1.0`** | Feature additions | New UI enhancements, Google Stitch UI components, novel playlist features |
| **`v2.0.1`** | Bug fixes / Hotfixes | Patch for recommendation weighting or CORS origin adjustment |

---

## 4. Emergency Production Hotfix Flow

If a critical bug occurs on `main` in production:

```bash
# 1. Branch directly off main
git checkout main
git pull origin main
git checkout -b hotfix/fix-cors-origin

# 2. Fix the bug, commit, and push
git commit -m "fix(security): resolve missing CORS fallback domain"
git push -u origin hotfix/fix-cors-origin

# 3. Open PR into main, merge & tag (e.g. v2.0.1)
git checkout main
git pull origin main
git tag -a v2.0.1 -m "Hotfix v2.0.1: Resolve CORS origin issue"
git push origin v2.0.1

# 4. CRITICAL: Merge hotfix back into staging so staging stays in sync!
git checkout staging
git pull origin staging
git merge main
git push origin staging
```
