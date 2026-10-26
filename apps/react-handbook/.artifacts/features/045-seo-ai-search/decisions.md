---
id: "045"
feature: seo-ai-search
created: 2026-10-22
---

# Decisions: SEO for AI search and LLMs

Decisions on gray areas and ambiguities resolved during discussion.

## Resolved

### This site's rules for AI crawlers

- **Question:** Should this site allow AI crawlers, block them, or treat training crawlers and AI search fetchers differently?
- **Decision:** Allow crawlers that fetch pages for AI search answers and for a user's request, and disallow crawlers that collect pages for model training.
- **Rationale:** The handbook can still be read and cited in AI answers, and the split is the distinction the page teaches, so the site's own rules are a working example of it.
- **Caveats:** The list of crawler names changes as vendors add bots. Fetchers that act on a user's request may not follow the rules at all, and the page says so.

### What the site serves for LLMs

- **Question:** Should the site serve only an llms.txt index, or also a full-text file or a plain copy of every page?
- **Decision:** One llms.txt index, built from the page list: the site summary, then a link and a summary for each page.
- **Rationale:** It's small and stays in step with the handbook. The page explains the full-text variant and the per-page copies without the site maintaining them.
- **Caveats:** Revisit if a major AI search engine documents that it reads llms.txt or per-page copies.

## Tentative

### Usage preference lines in robots.txt

- **Question:** Should this site's `robots.txt` also carry an IETF `Content-Usage` rule or a Cloudflare `Content-signal` line?
- **Tentative Decision:** No. The page explains both and the controls demo builds the lines.
- **Revisit when:** The IETF drafts become an RFC, or a major AI vendor documents honoring either.

### Bots without a primary source

- **Question:** Should the rules name bots that appear in CDN block lists but have no vendor documentation, such as Bytespider?
- **Tentative Decision:** No. Only bots with a vendor page are named, so every rule traces to a source.
- **Revisit when:** The vendor publishes documentation.
