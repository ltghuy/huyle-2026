---
id: "014"
feature: data-grid
audited: 2026-10-08
result: passed
---

# Audit: Advanced Data Grid

Evidence from four sources. The pure query, selection model and controller ran as Node scripts (`--experimental-strip-types`) against copies of the real modules, the controller with fake fetchers (per-request latency, abortable and non-abortable responses, injected failures). Parity ran in Node against the mock API of a production build (`pnpm build && pnpm start -p 3123`). UI checks ran on that build in headless Chrome, through the Puppeteer MCP (dispatched events) and a Puppeteer script with real mouse drags and key presses. The API was checked with `curl`. Quality gate re-run at audit time: `pnpm typecheck && pnpm lint && pnpm build` pass.

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: Multi-column sort, combined filters, paging; both modes show the same rows | Met | Browser: Salary ×2 then Shift+Department → headers "Salary 1 descending", "Department 2, sorted 2nd, ascending", `?sort=salary.desc,department.asc`; Next ×2 → "Showing 51–75 of 1,000". Department + salary min → chips and "58 of 1,000 employees match". Shift-clicking four headers kept 3 keys, the 4th replacing the 3rd. Same rows across mode switch. Parity: see SC1 |
| G2: Selection survives sort/filter/page; "select all matching" works for unloaded rows | Met | 2 rows on page 1 + 1 on page 2 → "3 selected"; filter to Sales → "3 selected · 3 hidden by filters". Header checkbox + "Select all 288 matching" → 288; untick one → 287; last page all ticked. Filter change: browser kept 287 as explicit ids (no notice); server (script) cleared with "…cleared because the filters changed". "Show selected only" → "Showing 1–25 of 287" |
| G3: Columns resize with mouse, touch or keyboard | Met | Real mouse drag of Role +100 px (leaving the handle 400 px vertically) → 340 px, no sort, no text selected; drag past the cap → 600 px; double-click → 240 px; Reset widths → all defaults. Alt+→ ×2 + Alt+Shift+→ → 150 → 220 px, announced "Department column 220 pixels wide"; 20 × Alt+Shift+← → 64 px; Alt+0 → 150 px. Touch and pen use the same pointer path (`touch-action: none`, pointer capture); not driven with a touch device |
| G4: Server mode never shows rows for an older view; cost difference visible | Met | See SC3. Stats line: browser "took 0.2 ms · downloaded 0 B · dataset 1,000 rows, 178.0 KB, downloaded once in 507 ms"; 10,000 rows 1.74 MB once; server "took 1242 ms · downloaded 1.9 KB" per view |
| G5: Fully usable with keyboard and screen reader | Met | See SC4 and SC5; `aria-rowcount` 1001, `aria-colcount` 9, `aria-multiselectable`, `aria-rowindex` from 2, `aria-selected` per row, `aria-sort` on the primary column, `aria-describedby` keyboard help, polite live regions for result/sort/page, selection count and widths |
| SC1: 300 random views × both sizes → identical rows and totals in both modes | Met | 600 of 600 views (random 0–3 sort keys, search words incl. accents and `%`, all filter types incl. impossible ranges, page 1–30, every page size, 30% with a random id selection, some "only selected") deep-equal between `queryEmployees` in Node and `POST /query`; 386 non-empty |
| SC2: Browser mode with 10,000 rows < 100 ms, 0 requests; server < 20 KB per view | Met | Keystroke/click to next frame with 10,000 rows: 32, 26, 12, 17, 17 ms (sorts) and 49, 13, 8 ms (search "a", "an", "ana"); request counter unchanged. Largest server response over the 600 parity views: 19,330 bytes (100 rows) |
| SC3: 1,000 ms random latency, fast sorts → 0 mismatches in 20 runs | Met | Server mode, 1,000 ms + up to 50% random, 2–5 rapid Name/Salary clicks per run (30–150 ms apart): 20 runs, 0 runs whose settled rows disagreed with the header's `aria-sort`; 70 requests sent. Script: out-of-order fake responses (120/10/60/5 ms) settled on the latest view |
| SC4: Every grid interaction works with the keyboard alone | Met | Real key presses: arrows, Home (to the checkbox cell), Space → "1 selected", Shift+Space → "3 selected", PageDown → next page with focus kept on the same cell ("3-2"), Tab leaves the grid in one press and Shift+Tab returns to the last cell. Dispatched keys: End, Ctrl+Home/End, PageUp, Enter (sort cycle), Shift+Enter (add key), Alt+arrows/Alt+0 (resize); one tab stop throughout; page-size change clamps the focused row |
| SC5: 0 serious/critical a11y issues both themes; no horizontal page scroll at 360 px | Met | axe-core 4.10.2 with multi-sort, selected rows, mixed header checkbox and filter chips: 0 serious/critical in light and dark. 360 px: document `scrollWidth` 360 (after fixing escaping sr-only text, see decisions.md), grid scrolls inside its own box (292 px wide, 1,276 px content) |

## Known minor issues (not blocking)

- axe `region` (moderate) on the page itself, carried over from feature 001.
- On phones the filter panel is a long single column (nine fields); a collapsible "Filters" panel would shorten it.
- The empty status line above the grid reserves 20 px so "Updating…" doesn't shift the grid; it reads as a small gap when idle.
