# Learn English

An English course for Vietnamese speakers, live at
[english.huyle.work](https://english.huyle.work). It has graded vocabulary with
pronunciation, grammar and tenses, a daily lesson, spaced-repetition review and
an exercise library. The interface is in Vietnamese; only the English being
taught appears in English.

There are no accounts. Progress (review schedule, attendance points, streak,
hard words, level) stays in the learner's browser, in IndexedDB. To move to
another device, the learner turns on sync and enters the code on the second
device, or saves and imports a backup file. The running app uses no AI: content
is drafted with Claude ahead of time, reviewed by the owner, and published to a
database, so exercises are built from reviewed items and checked against fixed
answers.

## What a learner can do

| Area | Path | What it does |
|------|------|--------------|
| Hôm nay | `/` | The daily lesson: review old words, learn new ones, a grammar point, sentence building and a short writing task. Finishing it adds attendance points and extends the streak |
| Từ vựng | `/vocabulary` | Words by level and topic, each with a Vietnamese meaning, IPA, example sentences and audio; search across every level |
| Ngữ pháp | `/grammar` | Grammar points and the 12 tenses, explained in Vietnamese with examples and practice |
| Động từ bất quy tắc | `/irregular-verbs` | The 108 common irregular verbs with past and past participle, Vietnamese meaning, IPA and one "go, went, gone" clip each; filters by level and by pattern (cut – cut – cut, buy – bought – bought, come – came – come, go – went – gone); practice whose answers get their own review schedule in Ôn tập |
| Ôn tập | `/review` | Reviews due today, scheduled with FSRS so each item comes back just before it would be forgotten |
| Bài tập | `/exercises` | Free practice: multiple choice, spelling, listening, sentence ordering |
| Từ khó | `/hard-words` | The words a learner gets wrong most often or takes longest to recall |
| Hồ sơ | `/profile` | Attendance points, streaks, a 12-week calendar and progress per level |
| Cài đặt | `/settings` | Name, level, appearance, sync, backup files, and replaying the guided tour |

A first visit asks for the learner's name, offers a placement test and then a
short guided tour. After a daily lesson, learners who joined the weekly
leaderboard (asked once, opt-in, leave any time in Cài đặt) see their place
this week among the other learners, ranked by attendance points since Monday. Lessons, review sessions and the placement test run full
screen, outside the navigation (`src/app/(focus)/`).

Published content today covers A1 to B2:

| Level | Words | Grammar topics |
|-------|-------|----------------|
| A1 | 1,164 | 12 |
| A2 | 1,411 | 11 |
| B1 | 2,445 | 9 |
| B2 | 2,775 | 7 |

C1 is paused. The word lists come from CEFR-J 1.5 (A1 to B2) and Octanove (C1);
sources and licenses are in `content/sources/SOURCES.md` and on the app's
"Nguồn dữ liệu" page.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (`base-nova` style, Base UI primitives) + `lucide-react`
- IndexedDB through `idb` for learner progress; `ts-fsrs` for review scheduling
- TanStack Query as the in-memory cache shared by every screen, on top of the IndexedDB copies
- Cloudflare Workers through `@opennextjs/cloudflare`, with D1 (Drizzle ORM) for content, sync blobs and anonymous stats
- Zod for content schemas, API input and env parsing
- Vitest + Testing Library (unit), Playwright (end to end)

## Getting started

The app lives in `apps/learn-english` of the
[huyle-2026](https://github.com/ltghuy/huyle-2026) monorepo (Turborepo + pnpm
workspaces), next to the portfolio and the Frontend Handbook. Install once at
the repo root:

```bash
pnpm install
```

Secrets are Cloudflare bindings, not `.env` files, because OpenNext would
inline `.env*` into the Worker bundle. Copy the commented block from
`.env.example` into `.dev.vars` (read by both `next dev` and the wrangler
preview) and set `STATS_SALT` to at least 32 random characters.

`pnpm dev` reads a local copy of the D1 database. Create its tables and load the
approved content into it:

```bash
cd apps/learn-english
pnpm exec wrangler d1 migrations apply learn-english --local
pnpm content:publish --local
pnpm dev
```

Open [http://localhost:3002](http://localhost:3002). Audio plays from the
deployed audio Workers, so it works locally without generating any clips.

The commands below run inside `apps/learn-english`, or from the root with
`pnpm --filter learn-english <command>`. Root `pnpm dev`, `pnpm build`,
`pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm e2e` run every app through
Turborepo.

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Dev server on port 3002 |
| `pnpm build` / `pnpm start` | Production build and Node server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `next typegen` + `tsc --noEmit` |
| `pnpm test` / `pnpm test:watch` | Unit tests (Vitest), once or in watch mode |
| `pnpm e2e` | Seed a separate local D1 with fixture content, build for Cloudflare, serve on port 3102 and run the Playwright suite in `e2e/` |
| `pnpm cf:preview` | Build for Cloudflare and run locally on workerd (root: `pnpm cf:english:preview`) |
| `pnpm cf:deploy` | Build and deploy to Cloudflare Workers (root: `pnpm cf:english:deploy`) |
| `pnpm cf:build` / `pnpm cf:deploy:prebuilt` / `pnpm cf:upload:prebuilt` | Split build, deploy and version-upload steps for Workers Builds |
| `pnpm cf:typegen` | Generate Cloudflare binding types (`cloudflare-env.d.ts`) |

### End-to-end tests

The Playwright suite runs against the Cloudflare preview, not `next dev`, with
its own D1 state in `.wrangler/e2e` seeded from `scripts/fixtures/content`, so
it never touches your local content. `tour.mobile.spec.ts` runs on a phone
viewport; the other specs run on desktop Chrome. Install the browser once:

```bash
pnpm exec playwright install chromium
pnpm e2e
```

## Content pipeline

Course content lives in `content/` as JSON, one file per kind and level
(`word/`, `sentence/`, `grammar/`, `writing/`). Every item starts as a draft and
reaches learners only after the owner approves it. The scripts run on the
owner's machine; none of them ship in the app bundle.

| Step | Command | What it does |
|------|---------|--------------|
| 1 | `pnpm content:import` | Build the word list skeleton (`content/wordlist/{level}.json`) from the CEFR-J and Octanove CSVs |
| 2 | `pnpm content:ipa` | Add General American IPA from the CMU Pronouncing Dictionary; list the words that need a hand-written transcription. Also fills empty IPA of irregular verb forms (`content/forms/`) |
| 3 | `pnpm content:draft` | Draft words, grammar, writing tasks and irregular verb forms with Claude through the Message Batches API (`submit`, `status`, `collect`; needs `ANTHROPIC_API_KEY` and costs money), or `import` drafts written elsewhere for free |
| 4 | `pnpm content:review` | List drafts, write an HTML review sheet per level, and `approve` or `unapprove` items. An item can only be approved once everything it references is approved |
| 5 | `pnpm content:audio` | Generate one male American English voice for every approved word, example sentence and irregular verb ("go, went, gone") without a clip (Kokoro runs locally for free), then `deploy` the clips to the two audio Workers |
| 6 | `pnpm content:publish` | Validate the approved content, check references, build the placement test and upsert changed rows into D1 (`--local` or `--remote`, `--levels`, `--dry-run`) |

Publishing bumps the content version last, so browsers refetch only after every
row is in. Learners see the update without a new release of the app. Each
script prints its full usage at the top of its file in `scripts/`.

`pnpm stats:report --from <date> --to <date> [--remote]` prints the anonymous
usage stats: lessons completed and distinct devices per day, exercises answered
per kind, and the 20 words answered wrong most often.

## Project layout

```
src/
├── app/
│   ├── (app)/           pages with navigation (today, vocabulary, grammar, review, …)
│   ├── (focus)/         full-screen lesson, review session and placement test
│   └── api/             route handlers: content, sync, stats, leaderboard
├── components/{area}/   UI by feature, shell (sidebar, mobile nav, page header), shadcn/ui primitives (ui/)
├── learning/            pure rules: scheduling, lesson plan, streaks, exercise generators, snapshot/merge
├── storage/             IndexedDB repositories (the only code that touches IndexedDB)
├── content/             Zod content schemas and the cached content fetcher
├── sync/, stats/        browser clients for the sync and stats APIs
├── server/              server-only services, Drizzle schema, env.ts
├── hooks/
└── lib/
content/                 course content (JSON), word list sources
scripts/                 content pipeline and stats report
migrations/              D1 migrations (drizzle-kit)
audio/                   wrangler configs of the two audio Workers
e2e/                     Playwright suite
```

## How this app is built

Development is spec-first. Each feature has a spec under
`.artifacts/features/learn-english/{ID}-{name}/` at the repo root (feature 001
is the app itself, with its spec, decisions, design and tasks). Small changes
are recorded under `.artifacts/quick/learn-english/`, and cross-feature
decisions and gotchas live in `.agents/knowledge.md` (`learn-english`
subsections). Agent rules are in this app's `CLAUDE.md` and `AGENTS.md` and in
`.claude/rules/learn-english/`, which apply only to files of this app.

Minimum quality gate before a change is done:

```bash
pnpm typecheck && pnpm lint && pnpm build
```

The rules ask Claude Code to load the same four skills as the handbook
(`spec-driven`, `vercel-react-best-practices`, `ui-ux-pro-max`,
`humanizer:humanizer`). Install steps are in the
[handbook README](../react-handbook/README.md#agent-skills).

## Deployment

The app is the Worker `learn-english` (`wrangler.jsonc`, `open-next.config.ts`)
on the custom domain `english.huyle.work`. It uses these bindings:

- `DB`: the D1 database `learn-english` (content, sync blobs, anonymous stats, the weekly leaderboard)
- `SYNC_LOOKUP_LIMITER`: a rate limit on wrong sync-code lookups, 10 per minute per IP
- `LEADERBOARD_LIMITER`: a rate limit on leaderboard writes, 20 per minute per IP
- `STATS_SALT`: a secret, set with `wrangler secret put STATS_SALT`

- **Automatic:** Cloudflare Workers Builds deploys pushes to `main` of the
  monorepo and uploads a preview version for other branches. Settings: root
  directory `/`, build command `pnpm cf:english:build`, deploy command
  `pnpm cf:english:deploy:prebuilt`, non-production branch deploy command
  `pnpm cf:english:upload:prebuilt`, build watch paths
  `apps/learn-english/*, packages/*, package.json, pnpm-lock.yaml, pnpm-workspace.yaml, turbo.json`.
  Each command needs the `pnpm` prefix: Workers Builds runs it in a plain
  shell, so `cf:english:build` alone fails with `not found`.
- **Manual:** `pnpm cf:english:deploy` from the repo root (needs `wrangler login`).

Neither applies D1 migrations. Apply new ones to production with
`pnpm exec wrangler d1 migrations apply learn-english --remote` before
deploying code that needs them.

Audio clips are static files served by two asset-only Workers, configured in
`audio/words.wrangler.jsonc` and `audio/sentences.wrangler.jsonc`, at
`audio-words.huyle.work` and `audio-sentences.huyle.work`. The app reads those
URLs at build time from `NEXT_PUBLIC_AUDIO_WORDS_URL` and
`NEXT_PUBLIC_AUDIO_SENTENCES_URL`; the defaults are in `.env.example`.

The app stays within the Workers free plan (10 ms CPU and 50 D1 queries per
request), so each API request makes one D1 call or one `db.batch()`.
