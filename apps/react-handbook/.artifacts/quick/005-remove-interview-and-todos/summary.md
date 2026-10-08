---
slug: remove-interview-and-todos
completed: 2026-10-08
---

# Summary: Drop "Interview" from the site and remove the todos sample API

## What Changed

The site is now the "Frontend Handbook": the name, the page title template, the meta description and the home page copy no longer mention interviews. The placeholder todos resource from the initial scaffold (`/api/todos` and its service and schema) was deleted; nothing used it. The api-scaffold baseline, knowledge.md, spec 001 and the pattern references in the 001/002/004 design docs were updated so they no longer point at deleted files.

## Files Modified

| File | Change |
|------|--------|
| src/practices/catalog.ts | `SITE_NAME` → "Frontend Handbook"; system design summary reworded |
| src/app/layout.tsx | Metadata title/template and description without "interview" |
| src/app/(playground)/page.tsx | Home eyebrow, intro and how-to copy reworded |
| src/app/api/todos/route.ts | Deleted |
| src/server/todos/todo.schema.ts, todo.service.ts | Deleted |
| .agents/baselines/api-scaffold.md | Todos resource marked removed; related gaps, risks, debt dropped |
| .agents/knowledge.md | Site-name decision updated |
| .artifacts/features/001-practice-playground/spec.md | Shell name updated |
| .artifacts/features/{001,002,004}-*/design.md | Pattern references moved from todos files to practice services/routes |

## Patterns Discovered

None

## Follow-Up

None. Quick task 004's artifacts keep the old name as history.
