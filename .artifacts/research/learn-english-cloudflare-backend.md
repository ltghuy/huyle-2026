---
topic: learn-english-cloudflare-backend
researched_at: 2026-10-26
version: "@opennextjs/cloudflare 1.20.13 (repo has 1.20.10) / wrangler 4.153.0 (repo has 4.149.0) / drizzle-orm 0.45.4 (1.0.0-rc.5 on rc tag) / drizzle-kit 0.31.11 / better-auth 1.7.13 / next-auth 5.0.0-beta.32 / next 16.3.8"
sources_hash: "n/a"
ttl_days: 90
keywords:
  - cloudflare d1
  - drizzle orm
  - better auth
  - auth.js
  - google oauth
  - r2
  - rate limiting
  - cron triggers
  - queues
  - opennext
  - getCloudflareContext
  - learn-english
---

# Backend for learn-english on Cloudflare Workers (D1, Drizzle, Better Auth, R2)

> Researched: 2026-10-26

Builds on `.artifacts/research/turborepo-pnpm-opennext-cloudflare.md` (monorepo, Workers Builds, turbo strict env) and on the `### repo` / `### react-handbook` sections of `.agents/knowledge.md` (`staticAssetsIncrementalCache`, `initOpenNextCloudflareForDev` in next.config). Nothing here repeats those findings.

## Summary

The stack that fits the existing apps is **D1 + Drizzle (`drizzle-orm/d1`) + Better Auth (Google only) + R2**, all reached through bindings from `getCloudflareContext()`. Each request builds its own DB client and its own Better Auth instance, because bindings only exist inside a request. D1 has **no interactive transactions**. `db.batch()` is the only atomic unit, and Drizzle's `db.transaction()` sends `BEGIN`, which D1 rejects. For a 20-per-day AI limit, count in D1 with one atomic upsert: the Workers Rate Limiting binding only supports 10 s or 60 s windows and is approximate and per-location. Pre-generating audio is better done as a one-off local script that uploads to R2 than as a cron job inside the OpenNext Worker. Serve the files from a custom-domain public bucket (or through a Worker route if access must be gated).

## Key Information

### 1. D1 from Next 16 on OpenNext

- **Getting bindings** (verified in `@opennextjs/cloudflare@1.20.10` `dist/api/cloudflare-context.js`):
  - `getCloudflareContext()` (sync, the default) reads `{ env, cf, ctx }` from a global that the Worker entry sets for each request in production, and that `initOpenNextCloudflareForDev()` sets in `next dev`. Use it in **dynamic** server components, route handlers, server actions and `proxy.ts`.
  - It throws when called during SSG/prerender or at module top level ("called in sync mode in either a static route or at the top level"). In those places use `await getCloudflareContext({ async: true })`, which falls back to wrangler's `getPlatformProxy()` at build time. Caution: build-time prerendering then reads **local** bindings and `.dev.vars` secrets (opennext.js.org/cloudflare/bindings).
  - In `next dev`, `initOpenNextCloudflareForDev()` (already in the handbook's `next.config.ts`) calls `getPlatformProxy({ envFiles: [] })`. Bindings in `getCloudflareContext().env` come from `wrangler.jsonc` and `.dev.vars`, not from `.env*`.
  - Bindings are simulated locally by default. Setting `"remote": true` on a binding uses the real resource (stable since wrangler 4.36.0).
  - Types: `wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts` (the handbook already has this as `cf:typegen`). Rerun it after every binding change.
- **Per-request clients**: OpenNext's DB guide says not to keep a global DB client. Create one per request inside a `getDb()` factory and wrap it in React `cache()` so one request reuses it (the `cache` only has an effect in server components). Add a separate `getDbAsync()` for static routes (opennext.js.org/cloudflare/howtos/db).
- **Local dev persistence**: `getPlatformProxy` persists by default to "the same location used by Wrangler", so `wrangler d1 migrations apply <db> --local` and `next dev` share one local SQLite file (developers.cloudflare.com/workers/wrangler/api/#getplatformproxy).
- **Migrations**: `wrangler d1 migrations create | list | apply <DATABASE_NAME> [--local|--remote]`. Applied files are recorded in the `d1_migrations` table. The binding takes `migrations_dir` (default `migrations`), `migrations_table`, and `migrations_pattern` (a glob for nested layouts that must start with `migrations_dir`). Cloudflare recommends passing the database **name**, not the binding name. If a migration would break foreign keys, run `PRAGMA defer_foreign_keys = true` first (developers.cloudflare.com/d1/reference/migrations/).
- **Transactions**:
  - D1 runs in auto-commit mode.
  - `db.batch([...stmts])` runs as one SQL transaction: if any statement fails, the whole batch rolls back. A batch counts as one query against the per-invocation limit, and the 30 s query limit covers the whole batch (developers.cloudflare.com/d1/worker-api/d1-database/, /d1/platform/limits/).
  - There are no interactive `BEGIN/COMMIT`. Better Auth's own D1 dialect throws `"D1 does not support interactive transactions. Use the D1 batch() API instead."` (verified in `@better-auth/kysely-adapter@1.7.13`).
  - `drizzle-orm@0.45.4` `d1/session.js` implements `transaction()` by running raw `begin`. Do not use `db.transaction()` on D1.
  - For read-then-write logic, use a single conditional statement (`INSERT … ON CONFLICT DO UPDATE … WHERE … RETURNING`) or a `batch`.
- **`withSession()`** gives sequential consistency for read replicas. Without it, every query goes to the primary.

### D1 limits (developers.cloudflare.com/d1/platform/limits/, page fetched 2026-10-26)

| Limit | Free | Paid |
|---|---|---|
| DB size | 500 MB | 10 GB |
| Storage per account | 5 GB | 1 TB |
| Databases per account | 10 | 50,000 |
| Queries per Worker invocation | 50 | 1,000 |
| Time Travel | 7 days | 30 days |

Both plans: 100 bound params per query, 100 KB SQL statement, 2 MB max row/string/BLOB, 100 columns per table, 30 s max query (also the whole batch), 6 simultaneous connections per invocation. Rows per table are unlimited within the DB size.

### D1 pricing (developers.cloudflare.com/d1/platform/pricing/)

- **Free**: 5 M rows read/day, 100 k rows written/day, 5 GB storage. Resets 00:00 UTC. Over the cap, queries **error** until the reset.
- **Paid**: 25 B rows read/month, 50 M written/month and 5 GB included; then $0.001 per M reads, $1.00 per M writes, $0.75 per GB-month.

### 2. Drizzle ORM

- **Versions**: `drizzle-orm` latest `0.45.4` (2026-10-08) and `drizzle-kit` latest `0.31.11` (2026-09-21). The Drizzle D1 docs page now installs the `@rc` tags (`1.0.0-rc.5`, 2026-10-21). Better Auth 1.7.13 peers accept `drizzle-orm ^0.45.2 || >=1.0.0-rc.1 <2` and `drizzle-kit >=0.31.4 || >=1.0.0-beta.1`.
- **Runtime client**: `import { drizzle } from "drizzle-orm/d1"`, then `drizzle(env.DB, { schema })`. Signature verified in `d1/driver.d.ts`: `drizzle(client, config?)`. It returns a `DrizzleD1Database` that has `.batch([...])`.
- **drizzle-kit**:
  - Running `drizzle-kit generate` with `dialect: "sqlite"` writes SQL migrations. Apply them with `wrangler d1 migrations apply`.
  - Drizzle writes one folder per migration (`migrations/0001_x/migration.sql`), so the wrangler binding needs `"migrations_pattern": "migrations/*/migration.sql"` next to `"migrations_dir": "migrations"`. Do not mix in `wrangler d1 migrations create`, which only writes top-level files (developers.cloudflare.com/d1/reference/migrations/).
  - Optional `driver: "d1-http"` with `dbCredentials: { accountId, databaseId, token }` (env `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, `CLOUDFLARE_D1_TOKEN`; token needs D1 edit) lets `push`, `migrate`, `introspect` and `studio` work against the remote DB over HTTP (orm.drizzle.team/docs/guides/d1-http-with-drizzle-kit). This is only needed for Studio. Keep wrangler as the single migration applier.
- **OpenNext bundling**: no Drizzle-specific patch or `serverExternalPackages` entry is documented. Prisma is the ORM that needs special handling. The only documented constraint is the per-request client.

### 3. Auth: Better Auth vs Auth.js v5

| | Better Auth 1.7.13 | Auth.js (next-auth 5.0.0-beta.32) |
|---|---|---|
| Release status | Stable; 1.7.13 published 2026-10-25 | v5 still **beta**; last publish 2026-07-20. `latest` tag is still v4.24.15 |
| Maintenance | Active | Since 2025-09-22 run by the Better Auth team. They recommend Better Auth for new projects; Auth.js gets security fixes |
| D1 | Native: passing a `D1Database` as `database` is auto-detected (checks `batch/exec/prepare`), uses its own Kysely D1 dialect, and turns transactions off. Or `drizzleAdapter(db, { provider: "sqlite" })`, where `transaction` defaults to `false` | `@auth/d1-adapter` 1.11.3, or `@auth/drizzle-adapter` 1.11.3 |
| Next 16 | peer `next ^14 \|\| ^15 \|\| ^16`. `toNextJsHandler`, `nextCookies()` plugin, documented `proxy.ts` usage | peer includes `^16` |
| Session in RSC | `await auth.api.getSession({ headers: await headers() })` | `await auth()` |
| Schema | CLI (`npx auth@latest generate`, package `auth` 1.7.13) emits a Drizzle schema | adapter docs give the SQL |

**Recommendation: Better Auth.** It is maintained and stable, Auth.js itself steers new projects to it, and it works with D1 through the Drizzle we already use. No OpenNext-specific Better Auth issue turned up in the OpenNext troubleshooting docs or in searches (see Uncertainties).

Better Auth facts verified in package source (`better-auth@1.7.13`, `@better-auth/core@1.7.13`):

- **Env**: secret from `BETTER_AUTH_SECRET` (falls back to `AUTH_SECRET`; `BETTER_AUTH_SECRETS` supports rotation). Base URL from `BETTER_AUTH_URL` or the `baseURL` option. The env reader only looks at `process.env`.
- **Cookie**: `better-auth.session_token`, with `__Secure-` added when the base URL is https. `sameSite: "lax"`, `httpOnly`. Session `expiresIn` defaults to 7 days and `updateAge` (refresh) to 1 day. The cookie cache is off by default.
- **Google**: `socialProviders.google = { clientId, clientSecret, prompt?: "select_account" }`. The redirect URI to register is `{baseURL}/api/auth/callback/google`. Refresh tokens need `accessType: "offline"` + `prompt: "select_account consent"`, which this app does not need. The client calls `authClient.signIn.social({ provider: "google" })` (better-auth.com/docs/authentication/google).
- **`proxy.ts`**: `getSessionCookie(request)` from `better-auth/cookies` only checks that the cookie exists, and the docs say it is not secure. Validate with `getSession` on every protected page or action.

### 4. R2 for audio

- **Binding**: `"r2_buckets": [{ "binding": "AUDIO", "bucket_name": "learn-english-audio" }]`.
  - `put(key, body, { httpMetadata: { contentType, cacheControl }, customMetadata })`.
  - `get(key, { onlyIf: request.headers, range: request.headers })`. When a precondition fails, the returned object has no body.
  - `object.writeHttpMetadata(headers)` copies the stored content-type and cache-control, and `object.httpEtag` gives the ETag value (developers.cloudflare.com/r2/api/workers/workers-api-reference/).
- **Serving options**:
  - (a) **Custom-domain public bucket** (e.g. `audio.huyle.work`): goes through the Cloudflare cache, supports cache rules, WAF and Access, and costs no Worker invocations. The domain must be a zone in the same account. By default only some file extensions are cached (check that `.mp3` is in the set, or add a Cache Rule). `r2.dev` is rate-limited and for development only (developers.cloudflare.com/r2/buckets/public-buckets/).
  - (b) **Next route handler** (`app/api/audio/[...key]/route.ts`) that streams `object.body`. Use this when files must be per-user or private. It costs Worker requests and CPU, and the handler must answer Range requests (206) itself for audio seeking.
- **Pricing**:
  - Free tier: 10 GB-month, 1 M Class A, 10 M Class B.
  - Paid: $0.015/GB-month, $4.50 per M Class A, $0.36 per M Class B.
  - Egress is free (developers.cloudflare.com/r2/pricing/).

### 5. Rate limiting (20 AI submissions per user per day)

- **Workers Rate Limiting binding** (`ratelimits: [{ name, namespace_id, simple: { limit, period } }]`, wrangler ≥ 4.36.0): `period` must be **10 or 60** seconds. Counts are approximate, eventually consistent and **per Cloudflare location**. Cloudflare says to use a Durable Object for strict limits (developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/). It **cannot express a daily quota**. At most it could add burst protection.
- **D1 counter**: the right tool here. One row per `(user_id, day_utc)`, claimed atomically in a single statement. A conditional upsert with `RETURNING` either increments or returns no row once the limit is reached, so no transaction is needed. Writes are 1 row per submission, far below the free 100 k/day.

### 6. Background jobs

- **OpenNext's generated worker only exports `fetch`**. Cron or queue handlers need a custom worker file that imports `./.open-next/worker.js`, re-exports `fetch: handler.fetch`, adds `scheduled` (or `queue`), and is set as wrangler `main`. It must also re-export DO classes if they are used (opennext.js.org/cloudflare/howtos/custom-worker).
- **Cron**:
  - Configured as `triggers.crons`, in UTC. Changes take up to 15 min to propagate.
  - Local tests: `/cdn-cgi/local/scheduled?cron=…`, or the Local Explorer on wrangler ≥ 4.139.0.
  - Limits: Free plan 5 crons/account and 10 ms CPU per cron; Paid 250 crons and 30 s CPU (15 min for intervals of 1 h or more) (developers.cloudflare.com/workers/configuration/cron-triggers/, /workers/platform/limits/).
- **Queues**: available on Free (10 k ops/day, 24 h retention). Paid includes 1 M ops/month, then $0.40 per M (developers.cloudflare.com/queues/platform/pricing/).

## Implementation Notes

Sketch only: verify against the docs when implementing.

**`wrangler.jsonc`**, extending the handbook's:

```jsonc
"d1_databases": [{ "binding": "DB", "database_name": "learn-english", "database_id": "<uuid>",
  "migrations_dir": "migrations", "migrations_pattern": "migrations/*/migration.sql" }],
"r2_buckets": [{ "binding": "AUDIO", "bucket_name": "learn-english-audio" }],
"services": [{ "binding": "WORKER_SELF_REFERENCE", "service": "learn-english" }],
"routes": [{ "pattern": "english.huyle.work", "custom_domain": true }]
```

**DB access** (`src/server/db/index.ts`, `server-only`):

```ts
export const getDb = cache(() => drizzle(getCloudflareContext().env.DB, { schema }));
```

Add `getDbAsync` for prerendered routes.

**Auth instance**: a per-request factory (`src/server/auth/auth.ts`):

```ts
export const getAuth = cache(() => betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(getDb(), { provider: "sqlite", schema }),
  socialProviders: { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET!, prompt: "select_account" } },
  plugins: [nextCookies()], // must be last
}));
```

- `app/api/auth/[...all]/route.ts`: `export const GET = (r: Request) => toNextJsHandler(getAuth()).GET(r)` (same for POST).
- Server components and actions: `const session = await getAuth().api.getSession({ headers: await headers() })`.
- `proxy.ts`: `getSessionCookie` only, for fast redirects.

**Env vars** (validate in `src/server/env.ts`):

- `BETTER_AUTH_SECRET` (≥ 32 random bytes), `BETTER_AUTH_URL` (`https://english.huyle.work`; `http://localhost:<port>` in dev), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- Prod: `wrangler secret put` (or the dashboard). Local: `.dev.vars` **and** `.env.local`. In `next dev`, `process.env` comes from Next's `.env*` loading, while `getCloudflareContext().env` comes from `.dev.vars`.
- In production, OpenNext copies every string binding (vars and secrets) into `process.env` per request (`populateProcessEnv` in `dist/cli/templates/init.js`), so reading `process.env` inside request scope works.

**Google Cloud Console**: authorized redirect URIs `https://english.huyle.work/api/auth/callback/google` and `http://localhost:<dev-port>/api/auth/callback/google`. Authorized JavaScript origins should be the same hosts.

**Daily quota** (one statement):

```sql
INSERT INTO ai_usage (user_id, day, count) VALUES (?1, ?2, 1)
ON CONFLICT (user_id, day) DO UPDATE SET count = count + 1 WHERE ai_usage.count < 20
RETURNING count;
```

No row returned means the limit was hit (HTTP 429). Claim the slot before calling the AI. Decide whether a failed AI call refunds the slot (a `count - 1` update).

**Migrations flow**: edit `schema.ts`, then `drizzle-kit generate`, then `wrangler d1 migrations apply learn-english --local`, then (on deploy) `--remote`. Running `--remote` in Workers Builds before `opennextjs-cloudflare deploy` needs an API token with D1 edit.

**Audio pre-generation**: a local Node script (`apps/learn-english/scripts/`) calls the TTS API and uploads with `wrangler r2 object put learn-english-audio/<key> --file … --content-type audio/mpeg --cache-control "public, max-age=31536000, immutable" --remote`, or with the S3 API. Use content-addressed keys (hash of text+voice) so files never change, and record each key in D1.

## Gotchas

- **`getCloudflareContext()` at module top level, or in a prerendered page, throws.** The DB and auth factories must be called inside a request. Pages that read the session are dynamic anyway (they use `headers()`).
- **Do not build `betterAuth({...})` at module scope** with a D1 or Drizzle instance: the binding does not exist yet. That pattern also breaks the "no global DB client" rule.
- **Drizzle `db.transaction()` on D1 fails** (raw `BEGIN`). Use `db.batch([...])`, or a single conditional statement.
- **Free-plan per-invocation limit is 50 D1 queries** (a batch counts as 1). Paid is 1,000.
- **Free plan CPU is 10 ms per HTTP request.** Dynamic SSR plus auth plus D1 on the free plan may hit it (I/O wait does not count, but React rendering does). The handbook avoids this by serving prerendered pages.
- **Next `.env*` files are inlined into the Worker bundle at build** (`nextEnvVars` in OpenNext's init template, keyed by `NEXTJS_ENV`). Never put production secrets in `.env.production`. Use wrangler secrets.
- **Worker size**: OpenNext troubleshooting still says Free 3 MiB / Paid 10 MiB gzipped. The Cloudflare limits page (updated 2026-10-12) now says 64 MiB uncompressed on both plans with **no** compressed limit. Trust Cloudflare's page, but watch the bundle (Better Auth pulls in kysely + jose + zod).
- **Rate Limiting binding periods are only 10 s or 60 s**: there is no daily window.
- **R2 custom domain caches only some extensions by default.** Confirm audio is cached or add a Cache Rule. With r2.dev enabled, the bucket stays public even if you add WAF or Access on the custom domain.
- **Serving audio through a route handler without Range support** breaks seeking (Safari is strict about 206).
- **Cron changes take up to 15 min to propagate**, and adding a cron means swapping wrangler `main` to a custom worker file.
- **The Better Auth CLI (`npx auth generate`) needs an importable auth config.** With a per-request factory it may not find a static `auth` export (see Uncertainties).
- **`drizzle-kit generate` output folders** need `migrations_pattern` in wrangler, or `apply` finds nothing.

## Integration Constraints (CLI/SDK interface, env vars, runtime constraints, error modes)

- **CLI / SDK**
  - `opennextjs-cloudflare build|preview|deploy|upload` (from the app dir)
  - `wrangler d1 create learn-english`
  - `wrangler d1 migrations apply learn-english --local|--remote`
  - `wrangler r2 bucket create learn-english-audio`
  - `wrangler secret put <NAME>`
  - `wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts`
  - `drizzle-kit generate`
  - `npx auth@latest generate` (Better Auth schema)
- **Env vars**
  - Runtime secrets: `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, plus the AI/TTS provider key.
  - Runtime var: `BETTER_AUTH_URL`.
  - Dev: `.dev.vars` with `NEXTJS_ENV=development`.
  - drizzle-kit d1-http (optional): `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, `CLOUDFLARE_D1_TOKEN`.
  - Turbo strict env: any var `next build` needs must be declared in `turbo.json` (see the existing research).
- **Runtime constraints**
  - `nodejs_compat` and compat date ≥ 2024-09-23. The handbook uses `2025-09-23`.
  - Edge runtime is not supported by OpenNext.
  - Bindings exist only in request scope.
  - At most 6 simultaneous D1 connections per invocation.
  - CPU: Free 10 ms per request, Paid default 30 s.
- **Error modes**
  - D1 free daily caps exceeded: queries error until 00:00 UTC.
  - `getCloudflareContext` outside a request: throws with a message about static routes or a missing init.
  - Wrong Google redirect URI: Google shows `redirect_uri_mismatch`.
  - Missing secret: Better Auth fails at init. In production it must not fall back to a default secret.
  - Rate-limit binding: approximate and can overshoot.

## Recommendations

1. **D1 + Drizzle `0.45.x` stable** (move to 1.0 once it leaves rc). Use a `getDb()` per request through React `cache`, `db.batch()` for multi-statement atomicity, never `db.transaction()`. Run migrations with `drizzle-kit generate` and apply them with `wrangler d1 migrations apply`, with `migrations_pattern` set.
2. **Better Auth 1.7.x with Google only**, using the `drizzleAdapter(provider: "sqlite")` so auth tables share the app's Drizzle schema and migrations. Build the instance per request with `getAuth()`, mount it at `/api/auth/[...all]`, add the `nextCookies()` plugin, read the session with `auth.api.getSession({ headers: await headers() })`, and only do a cookie check in `proxy.ts`. Avoid Auth.js v5: it is still beta and in maintenance mode.
3. **R2 + custom-domain public bucket** for pre-generated, non-secret audio, with content-hashed keys and `Cache-Control: public, max-age=31536000, immutable`. Fall back to a range-aware route handler only if audio must be private.
4. **Daily AI quota in D1** with one atomic conditional upsert per submission, using the UTC day as the key. Optionally add a Rate Limiting binding (`limit` ~5 per 60 s per user id) for burst abuse only.
5. **No cron or queues for v1.** Pre-generate audio with a local script that uploads to R2 and records the keys in D1. If on-demand generation is needed later, generate inside the request (with `ctx.waitUntil` for the R2 put), or add a Queue consumer through an OpenNext custom worker.
6. **Confirm the Workers plan.** Free-plan limits (10 ms CPU, 50 D1 queries per invocation, 100 k D1 writes per day) probably make Workers Paid ($5/month) the practical baseline for a dynamic, authenticated app.

## Uncertainties

- **No OpenNext-specific Better Auth issues** turned up. "No known issues" is based only on the OpenNext troubleshooting page and one web search; it was not tested with a real `opennextjs-cloudflare build`.
- **Better Auth CLI with a per-request factory**: whether `npx auth@latest generate` can load a config built as `getAuth()` is unverified. A workaround is a CLI-only `auth.ts` that exports a static instance over a dummy SQLite or Drizzle database. Another is to write the four tables (`user`, `session`, `account`, `verification`) by hand from the docs.
- **Better Auth native D1** (passing the `D1Database` directly) was verified in source (`@better-auth/kysely-adapter`), but no official docs page for it was found.
- **D1 rejecting `BEGIN TRANSACTION`** is shown by Better Auth's dialect error message, by drizzle issue #2463 and by community write-ups. No Cloudflare docs page states it outright; the D1 Worker API page describes only `batch()` as the transaction mechanism.
- **`wrangler d1 migrations apply` default target**: the wrangler docs do not say whether it defaults to local or remote. Always pass `--local` or `--remote` explicitly.
- **Worker size limit**: OpenNext's docs and Cloudflare's limits page conflict (see Gotchas).
- **Which file extensions R2 custom domains cache by default** (is `.mp3` included?) was not checked.
- **The Rate Limiting binding's behavior in `next dev`** through `getPlatformProxy` is not documented.
- **`better-auth` install shape**: it lists `@better-auth/drizzle-adapter` as a dependency. The docs import `drizzleAdapter` from `@better-auth/drizzle-adapter`, and `better-auth/adapters/drizzle` is also exported. Which import is canonical in 1.7 is unconfirmed.
- **Which Workers plan the account is on** is unknown.

## Sources

- OpenNext Cloudflare bindings: https://opennext.js.org/cloudflare/bindings
- OpenNext DB how-to: https://opennext.js.org/cloudflare/howtos/db
- OpenNext custom worker (cron/queue): https://opennext.js.org/cloudflare/howtos/custom-worker
- OpenNext get started: https://opennext.js.org/cloudflare/get-started
- OpenNext troubleshooting: https://opennext.js.org/cloudflare/troubleshooting
- Local source: `apps/react-handbook/node_modules/@opennextjs/cloudflare/dist/api/cloudflare-context.js`, `dist/cli/templates/init.js` (v1.20.10)
- D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- D1 Worker API (batch/exec/withSession): https://developers.cloudflare.com/d1/worker-api/d1-database/
- D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- D1 SQL statements (PRAGMA): https://developers.cloudflare.com/d1/sql-api/sql-statements/
- Wrangler D1 commands: https://developers.cloudflare.com/workers/wrangler/commands/d1/
- Wrangler getPlatformProxy: https://developers.cloudflare.com/workers/wrangler/api/#getplatformproxy
- Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cron triggers: https://developers.cloudflare.com/workers/configuration/cron-triggers/
- Queues pricing: https://developers.cloudflare.com/queues/platform/pricing/
- Rate Limiting binding: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- R2 Workers API: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
- R2 public buckets: https://developers.cloudflare.com/r2/buckets/public-buckets/
- R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Drizzle + D1: https://orm.drizzle.team/docs/connect-cloudflare-d1
- Drizzle Kit d1-http: https://orm.drizzle.team/docs/guides/d1-http-with-drizzle-kit
- Drizzle D1 transaction issue: https://github.com/drizzle-team/drizzle-orm/issues/2463
- D1 transactions write-up (third party): https://event-driven.io/en/cloudflare_d1_transactions_and_tradeoffs/
- Better Auth Drizzle adapter: https://www.better-auth.com/docs/adapters/drizzle
- Better Auth Next.js: https://www.better-auth.com/docs/integrations/next
- Better Auth Google: https://www.better-auth.com/docs/authentication/google
- Auth.js joins Better Auth: https://www.better-auth.com/blog/authjs-joins-better-auth and https://github.com/nextauthjs/next-auth/discussions/13252
- npm registry (`npm view`, 2026-10-26): drizzle-orm, drizzle-kit, better-auth, @better-auth/*, auth, next-auth, @auth/d1-adapter, @auth/drizzle-adapter, @opennextjs/cloudflare, wrangler
- Package source inspected via `npm pack`: better-auth 1.7.13, @better-auth/core 1.7.13, @better-auth/kysely-adapter 1.7.13, @better-auth/drizzle-adapter 1.7.13, drizzle-orm 0.45.4
