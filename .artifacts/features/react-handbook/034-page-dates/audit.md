# Audit: Created and updated dates on practice and topic pages

Checked on the dev server at 1280px, then with a production build.

| Item | Result | Evidence |
|------|--------|----------|
| G1: Every page header shows its latest date in place of the badge | Met | All 31 route pages (14 practices, 17 topics) return a `<time dateTime>` in the header; no practice or topic page still renders "Built" or "Written" in its header |
| G2: Dates match the repository history | Met | Seeded from `git log`: created is the first commit adding the route, updated is the latest commit touching the route or the page's content files |
| AC-001 | Met | Searchable Accordion shows "02" then "Created Oct 8, 2026" |
| AC-002 | Met | Networking shows "Updated Oct 13, 2026" |
| AC-003 | Met | `time` elements carry `2026-10-09` and `2026-10-13`; the formatter uses `en-US`, `dateStyle: "medium"` and UTC |
| AC-004 | Met | Searchable Accordion (created and updated on the same day) shows "Created Oct 8, 2026"; Debounced Search and Networking (updated later) show only "Updated Oct 13, 2026" |
| SC1 | Met | Browser check on one page of each kind, curl check on all 31 |
| SC2 | Met | `pnpm typecheck && pnpm lint && pnpm build` pass |
