## Decisions

- shadcn/ui with the `base-nova` style (Base UI primitives, not Radix) is the only UI component library -- it's the current shadcn CLI default; one library keeps a11y behavior and theming consistent <!-- feature:000 date:2026-10-06 -->
- Business logic lives in `src/server/*` services guarded by `server-only`; route handlers and Server Actions are thin adapters over them -- same logic serves HTTP consumers and the UI without an internal HTTP hop <!-- feature:000 date:2026-10-06 -->
- Zod for every trust boundary (request bodies, env vars) -- types and runtime validation come from one schema <!-- feature:000 date:2026-10-06 -->
- Practice features (002–015) hand-build their core logic with no third-party runtime libraries; basic shadcn primitives (Button, Input, Card) are allowed for styling, but shadcn's version of the practiced pattern (Dialog, Toast, Accordion…) is never used in that practice -- the point is to practice the hard part <!-- feature:001 date:2026-10-06 -->
- Practice demo data comes from this repo's own mock API routes (generated data, configurable latency + error injection); chat uses SSE + POST; uploads hit a real endpoint for real progress -- real network behavior without external dependencies <!-- feature:001 date:2026-10-06 -->
- Every practice page = title/summary, explanation panel, optional demo controls, live demo; one URL per practice -- consistent frame, refresh-safe, per-practice code loading <!-- feature:001 date:2026-10-06 -->
- The toast service from practice 002 is the playground's app-wide notification system: other practices raise toasts with the `toast` API from `src/practices/toast-notifications/toast-store.ts`; `<Toaster />` is mounted once in the playground layout (the one intended shell exception) <!-- feature:002 date:2026-10-06 -->
- Accordion panels use `aria-labelledby` without `role="region"` when many panels can be open (APG warns about landmark proliferation above ~6) <!-- feature:003 date:2026-10-06 -->

## Gotchas

- `next dev` rewrites the managed block in `AGENTS.md`; put project instructions in `CLAUDE.md` / `.claude/rules/`, not in `AGENTS.md` -- edits there get reverted <!-- feature:000 date:2026-10-06 -->
- shadcn `base-nova` components are built on Base UI, so Radix-specific props/examples (e.g. `asChild`) may not apply -- check the generated component source before copying docs examples <!-- feature:000 date:2026-10-06 -->
- Next 16 `error.tsx` and `catchError` fallbacks get `retry()` (re-fetch + re-render), not the old `reset()` -- training-data examples using `reset` are outdated; `catchError` from `next/error` is the component-level boundary <!-- feature:001 date:2026-10-06 -->
- shadcn init left dark mode class-based (`.dark`) with nothing setting the class, and `--font-sans: var(--font-sans)` self-referencing -- dark mode never activated and Geist never applied until fixed in 001 <!-- feature:001 date:2026-10-06 -->
- Turbopack (Next 16.3): server-side `import()` maps don't code-split client components. Every client chunk reachable from a page's module graph is emitted as a `<script>` for that page, and a layout importing the map pulls them into every page. Use separate route files (or client `next/dynamic`) for per-feature splitting <!-- feature:001 date:2026-10-06 -->
- The shadcn-generated `use-mobile.ts` fails the React Compiler lint rule `react-hooks/set-state-in-effect`; it was rewritten with `useSyncExternalStore` -- re-apply if the sidebar is ever re-added with `--overwrite` <!-- feature:001 date:2026-10-06 -->
- `pkill -f "next start"` doesn't match the running process (it renames itself `next-server`); stop test servers by port (`lsof -tiTCP:PORT -sTCP:LISTEN | xargs kill`) or stale builds get served <!-- feature:001 date:2026-10-06 -->
- Deleting or moving route/module files while `next dev` (Turbopack) runs can leave a stale module graph: "Module ... was instantiated ... but the module factory is not available". Restart dev with `rm -rf .next && pnpm dev`; only one `next dev` per project is allowed, so verify structural changes with `pnpm build && pnpm start` on another port <!-- feature:001 date:2026-10-06 -->
- shadcn neutral `--ring`/`--sidebar-ring` in light mode (L 0.708) gives only ~2:1 focus-ring contrast on near-white surfaces (WCAG needs 3:1); the sidebar ring was darkened to 0.556. Check ring contrast for any new focusable surface <!-- feature:001 date:2026-10-06 -->
- Headless Chrome doesn't apply `:focus-visible` to scripted `.focus()`; verify focus rings by computed tokens/contrast or with a real Tab key press <!-- feature:001 date:2026-10-06 -->
- Puppeteer screenshots call `setViewport`; if the page was opened with `isMobile`/`hasTouch`, that change reloads the page and wipes client state (e.g. the toast store). Test narrow layouts with a plain 360 px `defaultViewport` instead <!-- feature:002 date:2026-10-06 -->
- Accent-insensitive search must fold per character and keep an index map back to the original string; folding the whole string first breaks highlight positions because NFD and lowercasing can change length <!-- feature:003 date:2026-10-06 -->

## Codebase Feedback

- Each built practice owns a route `src/app/(playground)/practices/{slug}/page.tsx` rendering `PracticeFrame` with its `explanation`/`demo`, plus `built: true` in `src/practices/catalog.ts`; `[slug]` serves only placeholders and 404s <!-- feature:001 target:architecture date:2026-10-06 -->
- Practice demos compose `<DemoControls>` (optional) + `<DemoStage>` (error boundary) from `src/components/playground/` <!-- feature:001 target:conventions date:2026-10-06 -->
- App-wide client services use a module-level store + `useSyncExternalStore` with a constant server snapshot (see the toast store); mutate only from events/effects <!-- feature:002 target:conventions date:2026-10-06 -->
