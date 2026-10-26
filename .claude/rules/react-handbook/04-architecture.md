---
paths:
  - "apps/react-handbook/**"
---

# Fullstack Architecture

One Next.js 16 repo holds both frontend and backend.

| Layer | Location | Notes |
|-------|----------|-------|
| Pages / layouts | `apps/react-handbook/src/app/**` | Server Components by default |
| HTTP API | `apps/react-handbook/src/app/api/**/route.ts` | Thin: parse → call service → respond |
| Business logic | `apps/react-handbook/src/server/{domain}/*.service.ts` | Starts with `import "server-only"` |
| Schemas / types | `apps/react-handbook/src/server/{domain}/*.schema.ts` | Zod, no `server-only`, so UI can share them |
| Env | `apps/react-handbook/src/server/env.ts` | Zod-validated; add new vars here and to `.env.example` |
| Shared helpers | `apps/react-handbook/src/lib/*` | Must be safe for both client and server |
| UI primitives | `apps/react-handbook/src/components/ui/*` | shadcn-generated |

- Validate all external input with Zod (`parseBody` in `apps/react-handbook/src/lib/http.ts`).
- API error shape: `{ error: { message, issues? } }`. Status codes: 400 for
  bad JSON, 422 for failed validation.
- Read the bundled Next.js 16 docs in `node_modules/next/dist/docs/` before
  using an API you're not sure about (see `apps/react-handbook/AGENTS.md`).
- Package manager is **pnpm**.
