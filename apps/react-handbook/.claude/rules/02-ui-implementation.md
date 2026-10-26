# UI Implementation

## Always use the `vercel-react-best-practices` skill

Invoke the `vercel-react-best-practices` skill (Skill tool) as the **primary
guide** whenever you write, change, or review React/Next.js UI: components,
pages, layouts, client hooks, data fetching in RSC. Apply its CRITICAL and
HIGH rules (no waterfalls, bundle size, server-side performance) by default.

## shadcn/ui is the component library

- Config: `components.json`, style `base-nova` (Base UI primitives,
  **not Radix**), icons from `lucide-react`, CSS variables in
  `src/app/globals.css`.
- Before building any UI primitive (button, dialog, select, table, form
  field, toast, …), check whether shadcn has it and add it with
  `pnpm dlx shadcn@latest add <component>`. Don't hand-roll or install a
  second component library.
- `src/components/ui/` is CLI-owned. Prefer composition and variants
  (`cva`) in your own components over editing generated files; if you must
  edit one, keep the change minimal.
- Feature components go in `src/components/{feature}/`; shared app-level
  components go in `src/components/`.
- Use `cn()` from `@/lib/utils` to merge classes. Use theme tokens
  (`bg-background`, `text-muted-foreground`, …), not raw colors, so dark mode
  keeps working.

## Server/Client boundaries

- Default to Server Components. Add `"use client"` only at the smallest leaf
  that needs state, effects, or browser APIs.
- Never import from `src/server/**` in client components; it's guarded by
  `server-only` and the build will fail.
- Mutations from the UI: prefer Server Actions that call services in
  `src/server/*`; use `src/app/api/*` route handlers for external/HTTP
  consumers.
