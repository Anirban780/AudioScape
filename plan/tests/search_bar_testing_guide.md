# 🧪 AudioScape Search System — QA Testing Guide & Test Specification

## 1. Overview & Testing Strategy

This guide covers the full QA setup for the AudioScape Search System across three test tiers:

| Tier | File | Runner | Environment |
|---|---|---|---|
| **Frontend Component** | `frontend/components/Home/__tests__/SearchBar.test.jsx` | **Vitest** | `jsdom` |
| **Backend Service Unit** | `backend/src/tracks/__tests__/tracks.service.spec.ts` | **Jest + ts-jest** | `node` |
| **Live E2E Pipeline** | `backend/scripts/test-search-pipeline.js` | **Node.js** (bare) | Live HTTP |

### Quality Goals & Performance Metrics
- **Zero Regression on Bug Fixes**: No duplicate tracks on pagination, no race conditions on fast typing, no crash on `localStorage` disabled environments.
- **Cache Response Latency**: $< 50\text{ms}$ response time for cache hits (Relational Page Cache & PostgreSQL FTS) vs. $300\text{-}800\text{ms}$ for YouTube API round trips.
- **Quota Efficiency**: Zero YouTube API quota consumed when matches exist in PostgreSQL full-text search or relational page cache.

---

## 2. Test Environment Setup

### Frontend — Vitest + jsdom

The frontend tests run under **Vitest** (not Jest). The test configuration lives in [`vite.config.js`](../../vite.config.js):

```js
test: {
  globals: true,              // auto-injects describe/test/expect etc.
  environment: 'jsdom',       // emulates browser DOM (localStorage, events)
  setupFiles: ['@testing-library/jest-dom'], // enables toBeInTheDocument() etc.
  alias: {
    '@':    './utils',        // mirrors production path aliases
    'utils': './utils',
  },
}
```

**Key points:**
- Use `vi` from `vitest` for all mocking (`vi.mock`, `vi.fn`, `vi.spyOn`, `vi.useFakeTimers`).
- `describe`, `test`, `expect`, `beforeEach`, `afterEach` are **global** (no import needed) because `globals: true`.
- `vi` must still be **explicitly imported**: `import { vi } from 'vitest'`.
- `IntersectionObserver` is **not** available in jsdom — it must be stubbed via `vi.stubGlobal`.
- Binary static assets (`.jpg`) must be mocked: `vi.mock('../../assets/placeholder.jpg', () => ({ default: '' }))`.
- The `utils/components/ui/input` path alias must be mocked to avoid alias-resolution failure in test: `vi.mock('utils/components/ui/input', ...)`.

### Backend — Jest + ts-jest

The backend tests run under **Jest** (CommonJS / Node). Config lives in `backend/package.json`:

```json
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "testEnvironment": "node"
}
```

- Use `jest.mock`, `jest.fn`, `jest.spyOn` as normal.
- `@nestjs/testing` provides `Test.createTestingModule` for DI container setup.
- `ts-jest` transpiles TypeScript inline — no separate compile step needed.

---

## 3. Test Case Matrix & Assertions

### A. Frontend UI Test Cases (`SearchBar.test.jsx` — Vitest)

| Test ID | Test Name | Description / Action | Expected Result |
|---|---|---|---|
| **TC-FE-01** | **Debounce Input Throttling** | Type `"lofi"` across 3 rapid keystrokes. | `axios.get` called exactly **once** after 500 ms — not on every keystroke. |
| **TC-FE-02** | **AbortController Cancellation** | Type `"jazz"`, advance timers, inspect axios call config. | `config.signal` is an `AbortSignal` instance. |
| **TC-FE-03** | **Pagination Deduplication** | Load page 1, then page 2 with duplicate `videoId`. | `"Lofi Song Two"` appears exactly **once** in the DOM list. |
| **TC-FE-04** | **Keyboard Navigation** | `ArrowDown`×2 then `Enter` after results load. | `onSelectTrack` called with the **second** track's payload. |
| **TC-FE-05** | **Optimistic Track Selection** | `mouseDown` on first result item. | `onSelectTrack` fires **immediately** (synchronously) with basic metadata. |
| **TC-FE-06** | **Safe localStorage Handling** | `Storage.prototype.setItem` throws `QuotaExceededError`. | Component catches the error silently; `onSelectTrack` is still called normally. |

---

### B. Backend Service Test Cases (`tracks.service.spec.ts` — Jest)

| Test ID | Test Name | Description / Action | Expected Result |
|---|---|---|---|
| **TC-BE-01** | **Query Normalization** | Call `searchTracks("  Taylor   Swift!!  ")`. | DB lookup uses `normalizedQuery: 'taylor swift'`. |
| **TC-BE-02** | **Relational Page Cache Hit** | `searchQuery.findUnique` returns a valid cached page. | Result has `cached: true`, `source: 'page_cache'`; `hitCount` incremented; no YouTube API call. |
| **TC-BE-03** | **PostgreSQL FTS Lookup** | `$queryRaw` returns ≥ 8 FTS matches. | Result has `cached: true`, `source: 'postgres_fts'`; `axios.get` not called. |
| **TC-BE-04** | **YouTube API Fallback & Storage** | Cache miss + FTS miss → YouTube call. | Result has `source: 'youtube_api'`; `SearchQueryPage` + `SearchQueryPageResult` records are written; quota recorded. |
| **TC-BE-05** | **Track Metadata Cache** | `tracks.findUnique` returns a row. | `getTrackDetails` returns the cached row; no YouTube API call. |

---

### C. E2E Pipeline Test Cases (`test-search-pipeline.js` — Node)

| Test ID | Test Name | Description / Action | Expected Result |
|---|---|---|---|
| **TC-E2E-01** | **Live Search Endpoint** | `GET /youtube/search?query=lofi` | `200 OK`, non-empty `tracks[]`, valid `nextPageToken`. |
| **TC-E2E-02** | **Live Pagination** | `GET /youtube/search?query=lofi&pageToken=<token>` | Page 2 results with no overlapping `videoId`. |
| **TC-E2E-03** | **Cache Latency Benchmark** | Same query twice. | First call ~300–800 ms; second (cached) call < 50 ms. |
| **TC-E2E-04** | **Track Detail Endpoint** | `GET /youtube/track/:videoId` | `200 OK` with `duration`, `durationSeconds`, `thumbNail`. |

---

## 4. Package Installation

### Frontend (Vitest + React Testing Library)

```bash
# Via Docker Compose container:
docker compose exec frontend npm install --save-dev \
  vitest jsdom \
  @testing-library/react \
  @testing-library/jest-dom

# Or locally from project root:
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom
```

### Backend (Jest + ts-jest + NestJS Testing)

```bash
# Via Docker Compose container:
docker compose exec backend npm install --save-dev \
  jest @types/jest ts-jest \
  @nestjs/testing \
  supertest @types/supertest

# Or locally from backend folder:
cd backend && npm install --save-dev jest @types/jest ts-jest @nestjs/testing supertest @types/supertest
```

---

## 5. Running Tests

### A. Frontend — Vitest (inside Docker)

```bash
# Run the full SearchBar test suite:
docker compose exec frontend npx vitest run frontend/components/Home/__tests__/SearchBar.test.jsx

# Run all frontend tests:
docker compose exec frontend npm run test

# Run in watch mode (interactive, local dev only):
docker compose exec frontend npx vitest
```

> **Note:** The test script in `package.json` is `"test": "vitest run"`.  
> Do **NOT** use `jest` or `jest.mock` in frontend tests — the runner is Vitest.

---

### B. Backend — Jest (inside Docker)

```bash
# Run the full TracksService spec:
docker compose exec backend npm run test src/tracks/__tests__/tracks.service.spec.ts

# Run all backend specs:
docker compose exec backend npm run test

# Run with coverage:
docker compose exec backend npm run test -- --coverage
```

> **Note:** The backend `package.json` has `"test": "jest"` and a `jest` config block.  
> Do **NOT** use `vi` in backend tests — the runner is Jest.

---

### C. Live E2E Pipeline Script (inside Docker)

Requires the backend server to be running (`docker compose up backend`):

```bash
docker compose exec backend node scripts/test-search-pipeline.js
```

Or locally:
```bash
cd backend && node scripts/test-search-pipeline.js
```

---

## 6. Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `ReferenceError: jest is not defined` | Using `jest.mock` in a Vitest test file | Replace all `jest.*` with `vi.*` (import `vi` from `'vitest'`) |
| `ReferenceError: vi is not defined` | Using `vi.*` in a Jest (backend) test file | Use `jest.*` — backend runner is Jest, not Vitest |
| `IntersectionObserver is not defined` | jsdom doesn't implement `IntersectionObserver` | Add `vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)` in test file |
| `Failed to load module: utils/components/ui/input` | Path alias not resolved in test env | Add `vi.mock('utils/components/ui/input', ...)` stub in test |
| `Failed to parse ... placeholder.jpg` | jsdom can't parse binary files | Add `vi.mock('../../assets/placeholder.jpg', () => ({ default: '' }))` |
| `toBeInTheDocument is not a function` | `@testing-library/jest-dom` not set up | Add `setupFiles: ['@testing-library/jest-dom']` in `vite.config.js` test block |
