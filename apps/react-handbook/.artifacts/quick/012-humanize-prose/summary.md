# Summary: Humanize the reading text across the site

Edited the prose in 31 source files plus README.md with the humanizer rules: all practice "How it works" guides, every handbook topic page, the system-design prose, catalog summaries and the home page.

- Removed em/en dashes from prose (two left on purpose: a code comment and an empty-value placeholder).
- Rewrote "X, not Y" titles and closers that only added weight, staged openers, one-line closers, stock words (actually, really, crucially, seamless, subtly) and page self-descriptions.
- Dropped decorative `<strong>`/bold labels; kept bold where a term is introduced.
- Two topic titles changed text but kept their ids: "What this page loaded" (build pipeline), "TCP: reliable, ordered delivery" (networking).
- No code, ids, hrefs, `<code>` contents or behavior changed, so specs need no update.

Gates: pnpm typecheck, pnpm lint, pnpm build all pass.
