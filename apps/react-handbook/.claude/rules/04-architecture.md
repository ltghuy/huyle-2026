# Fullstack Architecture

One Next.js 16 repo holds both frontend and backend.

| Layer | Location | Notes |
|-------|----------|-------|
| Pages / layouts | `src/app/**` | Server Components by default |
| HTTP API | `src/app/api/**/route.ts` | Thin: parse → call service → respond |
| Business logic | `src/server/{domain}/*.service.ts` | Starts with `import "server-only"` |
| Schemas / types | `src/server/{domain}/*.schema.ts` | Zod, no `server-only`, so UI can share them |
| Env | `src/server/env.ts` | Zod-validated; add new vars here and to `.env.example` |
| Shared helpers | `src/lib/*` | Must be safe for both client and server |
| UI primitives | `src/components/ui/*` | shadcn-generated |

- Validate all external input with Zod (`parseBody` in `src/lib/http.ts`).
- API error shape: `{ error: { message, issues? } }`. Status codes: 400 for
  bad JSON, 422 for failed validation.
- Read the bundled Next.js 16 docs in `node_modules/next/dist/docs/` before
  using an API you're not sure about (see `AGENTS.md`).
- Package manager is **pnpm**.
