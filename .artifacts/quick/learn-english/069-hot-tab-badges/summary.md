# Summary: "Hot" badge on the Viết câu and Nghe chép tabs

## Changed

- `src/components/library/exercise-library.tsx`: `GROUPS` entries take `hot`; "Viết câu" and "Nghe chép" set it. `HotBadge` renders a flame-and-"HOT" pill (`bg-streak/15 text-streak`) when the tab row is at least 760 px wide, else a small flame on the tab's top-right corner with a screen-reader-only "Hot".
- Same file: the tab row is wrapped in an `@container`, and the triggers' gaps, padding, text size, icons and counts switch on the row's width (328, 448, 640 px) instead of the screen's. Measuring the badge showed that the four tabs of feature 040 already overflowed the row on 640 to about 1100 px screens: icons and counts need 633 px, and the sidebar leaves 704 px at 1024 and 448 at 768.
- `src/components/library/exercise-library.test.tsx`: only the last two tabs carry "Hot".
- Feature 040 spec (edge case) and `.agents/knowledge.md` updated for the row-width rule.

## Gates

- `pnpm --filter learn-english typecheck` and `lint` pass
- `pnpm --filter learn-english test`: 185 files, 1594 tests pass

## Browser check (Puppeteer, guest, `/exercises?tab=dictation&level=A1`)

| Screen | Row | Tabs use | Shown |
|--------|-----|----------|-------|
| 320 | 288 | 285 | names, corner flame |
| 480 | 448 | 445 | + counts |
| 640 | 608 | 605 | counts, corner flame |
| 768 (sidebar) | 448 | 445 | counts, corner flame |
| 1024 | 704 | 633 | + icons |
| 1280 | 960 | 744 | + "HOT" pills |

No horizontal scroll from the tabs at any of these. At 768 px the page scrolls 13 px sideways because of the footer's "Ủng hộ Tuxedo English" card; that predates this change and is not touched here.
