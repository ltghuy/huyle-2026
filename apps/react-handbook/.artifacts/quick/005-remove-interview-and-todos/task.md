---
slug: remove-interview-and-todos
status: done
branch: main
created: 2026-10-08
---

# Quick Task: Drop "Interview" from the site and remove the todos sample API

## What

Rename the site from "Frontend Interview Handbook" to "Frontend Handbook" (and drop interview wording from its copy), and delete the placeholder todos API (`/api/todos`) with its service and schema.

## Files

- src/practices/catalog.ts (SITE_NAME, system design summary)
- src/app/layout.tsx (metadata title + description)
- src/app/(playground)/page.tsx (home page copy)
- src/app/api/todos/route.ts (delete)
- src/server/todos/todo.schema.ts, src/server/todos/todo.service.ts (delete)
- .agents/baselines/api-scaffold.md, .agents/knowledge.md, .artifacts/features/001-practice-playground/spec.md (keep in sync)

## Expected Outcome

- Sidebar, home page and browser titles read "Frontend Handbook"; no "interview" wording remains in `src/`.
- `GET/POST /api/todos` return 404; nothing in `src/` references todos.
- Baseline, knowledge and spec 001 describe the new state.

## Quality Gates

Run after the change, before marking done:

- pnpm lint
- pnpm typecheck
- pnpm build
