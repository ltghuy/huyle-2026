---
id: "046"
feature: seo-at-scale
created: 2026-10-22
---

# Decisions: SEO at scale

Decisions on gray areas and ambiguities resolved during discussion.

## Resolved

### The Crawling page's placeholder example

- **Question:** The Crawling and indexing page's rules demo fetches "a page being written". Since 045 its example page is written, and after this page no placeholder is left. What should it fetch?
- **Decision:** An SEO lab page, which sends `X-Robots-Tag: noindex` from the site config. 042's AC-011 is updated to match.
- **Rationale:** The demo keeps a real noindex case. The placeholder mechanism stays in the code for future pages, and the page text still describes it.
- **Caveats:** If a new page is added unwritten, the demo could show it again.

### Where the SEO checks run

- **Question:** Should the SEO checks run in a CI service or in the existing end-to-end suite?
- **Decision:** A spec in the existing suite, run with `pnpm test:e2e`, recorded by the handbook reporter.
- **Rationale:** The repo has no CI pipeline, and the section plan names the end-to-end suite. The same spec would run in CI unchanged.
