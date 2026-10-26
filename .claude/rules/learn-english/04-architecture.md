---
paths:
  - "apps/learn-english/**"
---

# Architecture

Static, account-free app with no AI at runtime (feature 001, `design.md`).
Learner progress lives in the browser; a small API over one D1 database serves
content, sync blobs and anonymous stats. It must stay within the Cloudflare
Workers free plan (10 ms CPU, 50 D1 queries per request).

| Layer | Location | Notes |
|-------|----------|-------|
| Pages / layouts | `apps/learn-english/src/app/**` | Static shells, prerendered; content routes use query params, not dynamic segments |
| Learning rules | `apps/learn-english/src/learning/**` | Pure TypeScript: no React, IndexedDB or fetch. Scheduling, lesson plan, streaks, exercise generators, snapshot/merge |
| Browser storage | `apps/learn-english/src/storage/**` | IndexedDB via `idb`; the only module that touches it |
| Content client | `apps/learn-english/src/content/**` | Zod schemas (shared with scripts/API) and the cached content fetcher |
| HTTP API | `apps/learn-english/src/app/api/**/route.ts` | Thin: parse → call service → respond. One D1 call (or one `db.batch()`) per request |
| Services | `apps/learn-english/src/server/{domain}/*.service.ts` | Start with `import "server-only"` |
| Schemas | `apps/learn-english/src/server/{domain}/*.schema.ts` | Zod, no `server-only`, shareable with the UI |
| DB | `apps/learn-english/src/server/db/*` | Drizzle schema; `getDb()` per request, never at module scope |
| Env | `apps/learn-english/src/server/env.ts` | Zod-validated; secrets via `wrangler secret put`, never `.env*` |
| Scripts | `apps/learn-english/scripts/**` | Content pipeline (import, IPA, drafting, review, audio, publish) and stats report; run on the owner's machine only |

- `ts-fsrs` is pinned to an exact version and imported only by `src/learning/srs.ts`.
- The Anthropic SDK and the Google TTS client are script-only devDependencies; nothing from them may reach the app bundle.
- D1 has no interactive transactions: use `db.batch()` or one conditional statement.
- Validate all external input with Zod (`parseBody` in `apps/learn-english/src/lib/http.ts`).
  API error shape: `{ error: { message, issues? } }` with a Vietnamese `message`.
- Read the bundled Next.js 16 docs in `node_modules/next/dist/docs/` before
  using an API you're not sure about (see `apps/learn-english/AGENTS.md`).
