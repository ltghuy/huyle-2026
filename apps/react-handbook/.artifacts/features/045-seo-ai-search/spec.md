---
id: "045"
feature: seo-ai-search
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-22
---

# Feature: SEO section, SEO for AI search and LLMs

## Overview

AI assistants and answer engines now read, quote and link web pages, and
frontend engineers get asked what to do about it: block the AI bots, allow
them, add an `llms.txt`, rewrite pages "for AI". Most of that advice mixes
up three different things. Some crawlers collect pages to train models, some
build the index an AI answer cites from, and some fetch one page because a
user asked. Each vendor names its bots differently, Google's AI features run
on Googlebot and the normal index, and the control that keeps a site out of
training doesn't keep it out of AI answers.

This page explains how AI search finds and cites pages, which crawler does
what, which controls each vendor documents, what `llms.txt` is and who reads
it, and the standards and CDN features for usage preferences. It adds the
real setup to this site: `robots.txt` rules that allow AI search and
user-requested fetches and disallow training crawlers, and an `llms.txt`
built from the page list. The demos read the live `robots.txt` and
`llms.txt`.

## Goals

- [x] This site's `robots.txt` names every AI crawler the research documents, allows the search and user-request ones and disallows the training ones, and the site serves an `llms.txt` that lists every indexable page with its summary and passes the proposal's format.
- [x] Each of the five topics fits on about one screen of reading (plus a "read more") and has a demo whose result changes with the learner's input; two of them read this site's live files.
- [x] Every claim about a vendor's bots or controls traces to a primary source in the research cache, and claims the research marks unconfirmed are either left out or labelled as such on the page.

## Out of Scope

| Feature | Reason |
|---------|--------|
| A full-text `llms-full.txt` or plain copies of each page | Decided against (see decisions.md); the page explains both |
| Usage preference lines (IETF `Content-Usage` or Cloudflare `Content-signal`) in this site's `robots.txt` | Both are drafts or proposals no AI vendor documents honoring, and Search Console may flag the lines; the demo builds them instead |
| Changing Cloudflare bot settings or AI Crawl Control for this site | Account settings, not code; the page explains them |
| Blocking bots at the edge or by IP | `robots.txt` is the documented control; enforcement is a CDN setting |
| Search Console's generative AI control | Needs an owner's account; the page explains it |
| Writing pages "for AI" (chunking, rewriting) | Google says to ignore it; the page says so |
| International sites, migrations, SEO checks in CI | Page 6 |

## User Stories

### P1: The site's own setup

- As a learner, I want this site to send the AI crawler rules and the `llms.txt` the page explains, so that the examples are real.
- **Why P1:** The demos read them.
- **Independent Test:** Open `/robots.txt` and see a group per AI crawler; open `/llms.txt` and see every page listed.

**Acceptance Criteria:**

- [x] AC-001: WHEN `/robots.txt` is requested THEN it SHALL keep the existing rules for all crawlers and the sitemap line, disallow the whole site for every documented training crawler and training-control token (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot, meta-externalagent, Amazonbot, MistralAI-Training), and allow the whole site for every documented AI search and user-request crawler (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Meta-WebIndexer, Meta-ExternalFetcher, Amzn-SearchBot, Amzn-User, DuckAssistBot, MistralAI-Index, MistralAI-User).
- [x] AC-002: WHEN `/llms.txt` is requested THEN the site SHALL return plain text, built at build time, holding the site name as an H1, a one-line summary as a blockquote, and one H2 section per handbook section listing each indexable page as an absolute link with its summary.

### P1: AI crawlers

- As a learner, I want to know which AI bot does what and test robots rules against them, so that I block what I mean to block.
- **Why P1:** Blocking the wrong token removes a site from AI answers, or does nothing.
- **Independent Test:** Load this site's `robots.txt` in the tester; GPTBot is blocked, OAI-SearchBot is allowed; add `Disallow: /` for all agents and see every bot blocked.

**Acceptance Criteria:**

- [x] AC-003: WHEN the topic is shown THEN it SHALL explain the three jobs (training, search index, user request) with each major vendor's bot names, that control tokens such as Google-Extended and Applebot-Extended crawl nothing and only govern use, that several vendors say their user-request fetchers may ignore `robots.txt`, and that most AI crawlers don't document running JavaScript.
- [x] AC-004: WHEN the learner loads this site's live `robots.txt` (or edits rules, or loads a sample) THEN the demo SHALL list each documented AI bot with its vendor and job, say whether the rules allow it to fetch a chosen path and which group and rule decided it, and mark the bots whose vendor says they may ignore the rules.

### P1: How AI search uses pages

- As a learner, I want to see how an AI answer picks and cites pages, so that I know what actually decides it.
- **Why P1:** It's the question behind every "optimize for AI" request.
- **Independent Test:** Ask a question about this site; see the related searches, the pages found and the citations; set `nosnippet` on one page and see it drop out of the Google answer.

**Acceptance Criteria:**

- [x] AC-005: WHEN the topic is shown THEN it SHALL explain that Google's AI Overviews and AI Mode use Googlebot and the normal index with no extra requirements, query fan-out and grounding, that Bing's Copilot uses Bing's index, that Google calls optimizing for AI search "still SEO" and tells sites to ignore chunking and rewriting for AI, and how AI traffic shows in Search Console and Bing Webmaster Tools.
- [x] AC-006: WHEN the learner types or picks a question and sets per-page conditions (indexed, snippet allowed, crawler allowed) THEN the demo SHALL show related searches, the pages of this site they match, which pages each engine could cite and why each other page can't, labelled as a simplified model.

### P1: Controls

- As a learner, I want to pick what I want (in AI answers, out of training) and see the settings each vendor needs, so that I don't rely on the wrong switch.
- **Why P1:** Each vendor's controls cover different things.
- **Independent Test:** Choose "in search and AI answers, out of training"; see Googlebot allowed with Google-Extended disallowed, and GPTBot disallowed with OAI-SearchBot allowed.

**Acceptance Criteria:**

- [x] AC-007: WHEN the topic is shown THEN it SHALL explain Google's controls (Googlebot rules, Google-Extended, `nosnippet`, `data-nosnippet`, `max-snippet`, `noindex`, and the Search Console generative AI setting), Bing's (`noindex`, `noarchive`, `nocache`, `nosnippet`), and that leaving Google's AI features means leaving Search or limiting snippets.
- [x] AC-008: WHEN the learner picks a goal or sets each control THEN the demo SHALL show, per vendor, whether the site appears in normal search, in AI answers and in training, and the `robots.txt` lines and meta tags that produce it, noting where a vendor documents no control.

### P1: llms.txt

- As a learner, I want to read this site's `llms.txt`, check one I write, and know who reads it, so that I decide whether it's worth it.
- **Why P1:** Teams add it expecting search traffic.
- **Independent Test:** Load this site's file; every check passes and every link resolves. Delete the H1 and see the error.

**Acceptance Criteria:**

- [x] AC-009: WHEN the topic is shown THEN it SHALL explain the proposal (who wrote it, its status, the format, Markdown copies of pages and how they're found), that `llms-full.txt` isn't part of it, that Google Search says it doesn't use the file, that no AI search vendor documents reading it, and how this site builds its file.
- [x] AC-010: WHEN the learner loads this site's live `llms.txt` (or edits text, or loads a sample) THEN the demo SHALL check the parts in the proposal's order (H1 required, summary, sections of links), list problems with their line numbers, show the file's outline, and for this site's file check that each link is a page of this site that loads.

### P1: Usage preferences and bot traffic

- As a learner, I want to know the newer ways to state AI preferences and to read AI bot traffic, so that I can answer "are AI bots hitting us, and do they listen?".
- **Why P1:** It's the senior part of the topic and changes fast.
- **Independent Test:** Load the sample access log; see requests grouped by job, a fake GPTBot flagged because its address isn't on OpenAI's list, and a user fetcher that requested a disallowed path.

**Acceptance Criteria:**

- [x] AC-011: WHEN the topic is shown THEN it SHALL explain the IETF AI preferences drafts (the training, AI use and search labels, the `Content-Usage` header and rule) and their status, Cloudflare's Content Signals and how they differ, that no AI vendor documents honoring either yet, CDN bot controls and pay per crawl, and verifying a bot by its published IP list or reverse DNS instead of its user agent.
- [x] AC-012: WHEN the learner loads the sample access log (or pastes log lines) THEN the demo SHALL group requests by bot and job, flag requests whose user agent claims a bot but whose address isn't in that vendor's published ranges, flag requests to paths the site's rules disallow for that bot, and label the sample log and IP ranges as sample data.

### P3: Notes and reading

- **Why P3:** Polish.

**Acceptance Criteria:**

- [x] AC-013: WHEN a topic is shown THEN it SHALL end with a short "read more" holding the senior-level points (blocking a search bot removes you from that vendor's AI answers, `robots.txt` is a request and enforcement is a CDN's job, bot lists change and need review, AI features are counted inside normal search reports, `llms.txt` costs little but brings no Google traffic) and links to the primary sources it draws from.

## Edge Cases

- WHEN the `robots.txt` tester's rules have a line it can't parse THEN it SHALL show the line number and ignore that line, as crawlers do.
- WHEN a bot matches no group and there's no group for all agents THEN the tester SHALL say it may fetch everything.
- WHEN the learner's question in the AI answer model matches no page THEN it SHALL say no page of this site matches.
- WHEN `llms.txt` text is empty THEN the checker SHALL report the missing H1 and show no outline.
- WHEN a pasted log line can't be parsed THEN the log demo SHALL count it as unparsed and show it.
- WHEN a fetch fails THEN the demo SHALL say so and offer to retry.

## Success Criteria

- [x] `/robots.txt` has a group for every bot in AC-001 with the right rule, and the existing rules and sitemap line are unchanged (verified with the tester and by script).
- [x] Every link in `/llms.txt` is a sitemap URL, and every sitemap URL except the home page is in `/llms.txt`.
- [x] The How search works crawler view and the earlier SEO demos still work with the new `robots.txt`.
- [x] The page passes axe in light and dark themes (apart from the site-wide sidebar finding noted in 041), works at 360 px width without horizontal scroll, and every demo can be used with the keyboard.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Open Questions

- None

## Notes

Sources: the bot pages of OpenAI, Anthropic, Google, Perplexity, Apple,
Common Crawl, Meta, Amazon, DuckDuckGo and Mistral; Google's AI features and
AI optimization pages and Search Console help; Bing's webmaster guidelines;
llmstxt.org; the IETF aipref drafts; Cloudflare's bot and AI Crawl Control
docs; the bundled Next.js 16 docs on robots and route handlers. Checked
2026-10-22. Bot lists change, so the page shows that date.

The live site currently serves an older build (no sitemap, no SEO pages), so
the live checks run against a local build until it's deployed.

## Baseline

### Current Behavior

- `robots.txt` allows every crawler everywhere and names the sitemap. It has no AI-specific rules.
- The site serves no `llms.txt`.

### Gaps / Limitations

- The site can't serve as an example of the AI crawler rules the page teaches, and the AI training crawlers this decision blocks are currently allowed.
