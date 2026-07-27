# AudioScape Database Setup, Migration & Operations Guide

This guide details all commands and instructions required to set up the local PostgreSQL database, apply Prisma schemas, execute supplementary SQL functions/triggers, run the Firestore-to-PostgreSQL backfill script, and inspect data.

---

## Quick Reference Summary

| Task | Command |
|---|---|
| Start Local Postgres | `docker compose up -d postgres` |
| Stop Local Postgres | `docker compose down` |
| Install Dependencies | `cd backend && npm install` |
| Generate Prisma Client | `npx prisma generate` |
| Run Prisma Migrations | `npx prisma migrate dev --name init` |
| Apply Triggers & Extensions | `npx prisma db execute --file ./prisma/migrations/manual_supplementary.sql` |
| Run Firestore Backfill | `npm run backfill` |
| Launch Prisma Studio (GUI) | `npx prisma studio` |

---

## Detailed Step-by-Step Instructions

### Step 1: Start Local PostgreSQL (Docker)

Make sure Docker Desktop is running, then run from project root:

```bash
docker compose up -d postgres
```

To verify the container is running and healthy:

```bash
docker ps
```

---

### Step 2: Configure Environment Variables

Verify that `backend/.env` contains your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/audioscape?schema=public"
```

---

### Step 3: Install Backend Dependencies & Generate Prisma Client

Navigate to the `backend` folder and run:

```bash
cd backend
npm install
npx prisma generate
```

---

### Step 4: Run Initial Prisma Migration

Create and apply the core database tables defined in `backend/prisma/schema.prisma`:

```bash
npx prisma migrate dev --name init
```

*This creates all 9 models: `users`, `listen_history`, `playlists`, `playlist_tracks`, `channels`, `tracks`, `search_queries`, `query_track_results`, and `api_quota_usage`.*

---

### Step 5: Apply Supplementary SQL (Extensions, Triggers & Constraints)

Execute the raw SQL migration script to enable trigram matching, unaccenting, auto-maintained `tsvector` full-text search triggers, and CHECK constraints:

```bash
npx prisma db execute --file ./prisma/migrations/manual_supplementary.sql
```

---

### Step 6: Run Firestore to PostgreSQL Backfill Script

To import all existing users, music histories, playlists, and cached search queries from Firestore into PostgreSQL:

```bash
npm run backfill
# OR: node scripts/backfill-firestore-to-postgres.js
```

---

### Step 7: Inspect Database Visually (Prisma Studio)

Launch Prisma Studio to view, filter, and inspect your PostgreSQL database tables in a web interface:

```bash
npx prisma studio
docker compose exec backend npx prisma studio --hostname 0.0.0.0 --port 5555 --browser none
```

Open `http://localhost:5555` in your browser.

---

## Production Deployment to Neon (PostgreSQL)

When you are ready to switch from local PostgreSQL to Neon PostgreSQL:

1. Create a new PostgreSQL database instance on [Neon.tech](https://neon.tech).
2. Copy the database connection string from your Neon dashboard.
3. Update `DATABASE_URL` in your production environment / `.env`:
   ```env
   DATABASE_URL="postgresql://<user>:<password>@<neon-host>/audioscape?sslmode=require"
   ```
4. Run migrations against Neon:
   ```bash
   npx prisma migrate deploy
   npx prisma db execute --file ./prisma/migrations/manual_supplementary.sql
   ```

---

## Resetting / Rebuilding Local Database

If you ever need a clean slate locally:

```bash
# 1. Stop and remove postgres container & volume
docker compose down -v

# 2. Start fresh postgres container
docker compose up -d postgres

# 3. Re-apply schema & supplementary SQL
cd backend
npx prisma migrate dev --name init
npx prisma db execute --file ./prisma/migrations/manual_supplementary.sql

# 4. Re-run backfill script
npm run backfill
```
