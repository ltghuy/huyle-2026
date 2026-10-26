---
topic: ai-search
checked: 2026-10-22
used-by: ["045"]
---

# SEO for AI search and LLMs: what vendors document

Primary sources only (vendor docs, specs, IETF drafts). Quotes are verbatim and under 15 words, checked on 2026-10-22. "Unconfirmed" marks anything a primary source didn't state. Basics already covered in `seo-fundamentals.md` (robots.txt matching, robots meta rules, snippets, JavaScript SEO) aren't repeated here.

## Training vs search vs user fetch

Most vendors now split their bots into three jobs, and robots.txt treats each token on its own:

- Training crawler: collects pages for model training. Honors robots.txt.
- Search/index crawler: builds the index an AI answer cites from. Honors robots.txt. Blocking it removes you from that vendor's AI search.
- User-triggered fetcher: fetches one URL because a user asked. Several vendors say it may ignore robots.txt.
- Control-only tokens (Google-Extended, Applebot-Extended): no crawler of their own. They only govern how content the main crawler already fetched may be used.

## AI crawlers and user agents

### OpenAI

Source: https://developers.openai.com/api/docs/bots (platform.openai.com/docs/bots now 301s here; no date shown on the page)

- `OAI-SearchBot`: search. "OAI-SearchBot is for search." Opted-out sites can still show as navigational links. Robots.txt changes take about 24 hours to reach search.
- `GPTBot`: training. "Disallowing GPTBot indicates a site's content should not be used in training."
- `ChatGPT-User`: user actions in ChatGPT and Custom GPTs. "Because these actions are initiated by a user, robots.txt rules may not apply." It "is not used for crawling the web in an automatic fashion" and doesn't decide search inclusion.
- `OAI-AdsBot`: checks pages submitted as ads; "OAI-AdsBot only visits pages submitted as ads." Not used for training.
- Settings are independent. If both OAI-SearchBot and GPTBot are allowed, OpenAI may reuse one crawl for both purposes.
- IP lists: openai.com/searchbot.json, gptbot.json, chatgpt-user.json, adsbot.json.

### Anthropic

Source: https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler (updated 2026-04-07 per the page)

- `ClaudeBot`: training. Restricting it signals that "future materials should be excluded from our AI model training datasets".
- `Claude-SearchBot`: search. It "navigates the web to improve search result quality for users." Blocking it may reduce visibility in Claude's search answers.
- `Claude-User`: user-initiated. "When individuals ask questions to Claude, it may access websites". Blocking it stops retrieval in response to user queries.
- All three: "Anthropic's Bots respect 'do not crawl' signals" via robots.txt. Unlike OpenAI and Perplexity, Anthropic doesn't carve out an exception for its user fetcher.
- Supports non-standard `Crawl-delay`. IP blocking "may not work correctly or persistently guarantee an opt-out".

### Google

Sources: https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers (updated 2026-10-15), https://developers.google.com/crawling/docs/crawlers-fetchers/google-user-triggered-fetchers, https://developers.google.com/search/docs/appearance/ai-features

- AI Overviews and AI Mode use `Googlebot`. "AI is built into Search and integral to how Search functions", so Googlebot rules in robots.txt are the crawl control for them. Blocking Googlebot to avoid AI features also removes you from Search.
- `Google-Extended` is a control token with no user agent: "Crawling is done with existing Google user agent strings". It governs training future Gemini models and grounding in Gemini Apps and Grounding with Google Search on Vertex AI.
- "Google-Extended does not impact a site's inclusion in Google Search". It does not opt you out of AI Overviews or AI Mode (see the Search generative AI control below).
- User-triggered fetchers "generally ignore robots.txt rules." These include `Google-Agent` (agents on Google infrastructure acting "upon user request"), `Google-GeminiNotebook` (formerly `Google-NotebookLM`, supported until August 2026) and `Google-Read-Aloud`.
- Google is experimenting with Web Bot Auth for Google-Agent, using the `https://agent.bot.goog` identity.
- Googlebot renders JavaScript (see `seo-fundamentals.md`).

### Microsoft / Bing (Copilot)

Source: https://www.bing.com/webmasters/help/which-crawlers-does-bing-use-8c184ec0

- Listed crawlers: `Bingbot`, `AdIdxBot`, `BingPreview`, `MicrosoftPreview`, `BingVideoPreview`. There's no separate Copilot crawler on the list; the guidelines describe Copilot as relying on "the same core crawling, indexing, and ranking foundation" as search.
- Bingbot renders: Bing updates its rendering engine "to the most recent stable version of Microsoft Edge."
- Controls are robots.txt and the Crawl control tool in Bing Webmaster Tools.

### Perplexity

Source: https://docs.perplexity.ai/guides/bots (no date shown)

- `PerplexityBot`: search. It is "designed to surface and link websites in search results on Perplexity". "It is not used to crawl content for AI foundation models."
- `Perplexity-User`: user-triggered. "this fetcher generally ignores robots.txt rules." Not used for training.
- IP lists: perplexity.com/perplexitybot.json and perplexity-user.json. Changes take "up to 24 hours".

### Apple

Source: https://support.apple.com/en-us/119829 (published 2026-09-04 per the page)

- `Applebot`: powers search in Spotlight, Siri and Safari, and may also be used to train Apple foundation models. Follows Googlebot rules if robots.txt has none for Applebot. Ignores crawl-delay.
- Renders: "Applebot may render the content of your website within a browser."
- `Applebot-Extended`: control token for training use. "Applebot-Extended does not crawl webpages." Disallowing it doesn't remove pages from Apple search.

### Common Crawl

Source: https://commoncrawl.org/ccbot (no CCBot-specific date)

- `CCBot`, user agent `CCBot/2.0 (https://commoncrawl.org/faq/)`. Block it with a `CCBot` group and `Disallow: /`.
- "CCBot is now run on dedicated IP address ranges with reverse DNS." Ranges at index.commoncrawl.org/ccbot.json.
- Common Crawl's dataset is a common source of LLM training data. The page itself doesn't mention training (unconfirmed from this source).

### Meta

Source: https://developers.facebook.com/docs/sharing/webmasters/web-crawlers (no date shown)

- `meta-externalagent`: uses include "training foundation AI models".
- `Meta-WebIndexer`: improves Meta AI search; allowing it "helps us cite and link to your content".
- `Meta-ExternalFetcher`: user-requested fetches; "this crawler may bypass robots.txt rules."
- `facebookexternalhit`: link previews for shared URLs; "might bypass robots.txt when performing security or integrity checks."
- `Meta-ExternalAds`: ads and business products.
- Meta crawlers "may cache the contents of robots.txt for up to 24 hours".

### Others with official docs

- Amazon (https://developer.amazon.com/amazonbot): `Amazonbot` "may be used to train Amazon AI models"; `Amzn-SearchBot` (Alexa and search; "does not crawl content for generative AI model training"); `Amzn-User` (user actions, "it may not follow all robots.txt directives"). No crawl-delay. Amazon reads the `noarchive` meta tag as "do not use the page for model training".
- DuckDuckGo (https://duckduckgo.com/duckduckgo-help-pages/results/duckassistbot): `DuckAssistBot` "crawls pages in real-time for our AI-assisted answers"; "This data is not used in any way to train AI models." Opt-out takes 72 hours and doesn't affect organic rankings.
- Mistral (https://docs.mistral.ai/robots): `MistralAI-User` (user actions in Vibe), `MistralAI-Index` (search index, "not used for generative AI training of any kind"), `MistralAI-Training` (training datasets). The page doesn't say how MistralAI-Index treats robots.txt (unconfirmed).
- Bytespider (ByteDance): appears in Cloudflare's managed block list, but I found no ByteDance doc (unconfirmed).

### JavaScript execution

- Documented as rendering: Googlebot (Chrome), Bingbot (Edge), Applebot ("may render").
- OpenAI, Anthropic, Perplexity, Common Crawl, Meta, Amazon, DuckDuckGo, Mistral: their docs don't say whether their bots run JavaScript (unconfirmed). Google's own advice applies: "not all bots can run JavaScript", so server-render anything you want cited.

## Google: AI Overviews and AI Mode

Sources: https://developers.google.com/search/docs/appearance/ai-features (updated 2025-12-10), https://developers.google.com/search/docs/fundamentals/ai-optimization-guide (added 2026-05-15; llms.txt note added 2026-06-15 per https://developers.google.com/search/updates)

- Eligibility: a page must be indexed and eligible to show "in Google Search with a snippet". "There are no additional requirements to appear in AI Overviews or AI Mode".
- The newer optimization guide adds one requirement: the site must be included via the Search generative AI control in Search Console. Inclusion is the default, so the two pages don't conflict in practice.
- "You don't need to create new machine readable files, AI text files, or markup". No special schema.org markup either.
- Both features may use "query fan-out" (several related searches across subtopics). The optimization guide also names retrieval-augmented generation (grounding) on the Search index.
- AEO/GEO: "optimizing for generative AI search is optimizing for the search experience, and thus still SEO."
- The guide says you can ignore "chunking" content, rewriting for AI and chasing inauthentic mentions. Creating pages for every fan-out query "primarily to manipulate rankings" falls under the scaled content abuse policy.
- Spam policies apply to generative AI responses (updates log, 2026-05-15).
- Preferred sources became available in AI Mode and AI Overviews on 2026-05-27 (updates log).

### Controls

- Crawl: robots.txt rules for `Googlebot`.
- Limit what's shown: "use nosnippet, data-nosnippet, max-snippet, or noindex controls." Google publishes no AI-only meta tag.
- Search generative AI control (https://support.google.com/webmasters/answer/16908024; rolled out to all sites worldwide as of 2026-08-31): a Search Console setting at Settings > Search generative AI. It covers AI Overviews, AI Mode and generative AI features in Discover.
  - Include is "the default control for all properties". Exclude removes links and grounding use, so the site gets no traffic or impressions from those features.
  - Works per property, with child properties inheriting from their parent. Takes effect "within 1-2 days after the control goes live".
  - It "isn't used as a ranking or inclusion signal affecting other parts of Search." It "doesn't affect AI training"; use Google-Extended for that. Use `noindex` to leave Search entirely.
- Google-Extended: training and grounding in Gemini and Vertex AI only, not Search features.
- Preview-control changes need a recrawl, which "can take anywhere from several days to several months".

### Search Console

Sources: https://support.google.com/webmasters/answer/7042828, https://support.google.com/webmasters/answer/16984139

- AI Overviews and AI Mode traffic is counted in the Performance report "within the 'Web' search type". AI Mode started counting toward totals on 2025-06-16.
- AI Overviews: "An AI Overview occupies a single position in search results"; all its links share that position. A click on an external link counts as a click.
- AI Mode: position follows normal results-page rules. A follow-up question counts as a new query.
- Generative AI performance report (all sites as of 2026-08-31): impressions only, for AI Overviews and AI Mode. Grouped by page, country, date and device; filtered by "Web: text-based" or "Web: multimodal". Search Labs experiments are excluded, and Discover has its own report.
- Google: clicks from results pages with AI Overviews are "higher quality" (users spend more time on site). That's Google's claim and Google gives no numbers.

## Bing / Copilot

Sources: https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a (current, no date shown), https://blogs.bing.com/webmaster/september-2023/Announcing-new-options-for-webmasters-to-control-usage-of-their-content-in-Bing-Chat (2023-09-22), https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c

- The guidelines now cover "Bing search experiences, Copilot, and grounding API results."
- `NOINDEX`: keeps a URL out of "Bing search, Copilot experiences, or grounding API results."
- `NOARCHIVE` "prevents content from being used in Copilot responses and grounding results."
- `NOCACHE` "limits Copilot to using only the URL, title, and snippet". Bing advises against it on content meant for Copilot.
- `NOSNIPPET` and `DATA-NOSNIPPET` prevent captions "and may limit Copilot citation quality." The page then says to use "the data-snippet attribute" to choose citable text. No such attribute is documented elsewhere, so this may be a typo (unconfirmed).
- 2023 post on training: with NOARCHIVE, "we will not use the content for training"; with NOCACHE, only URLs, titles and snippets may be used. "If content has both NOCACHE and NOARCHIVE tags, we will treat it as NOCACHE." The current guidelines don't repeat the training part (unconfirmed whether it still applies).
- IndexNow and accurate `lastmod` are recommended for keeping Copilot answers fresh.
- Abuse list includes "Prompt Injection and AI Manipulation" aimed at models "used by Bing or Copilot". The guidelines also say "GEO does not guarantee grounding or citations in AI experiences."
- AI Performance report in Bing Webmaster Tools covers Copilot, AI summaries in Bing and "Select partner AI integrations", with total citations, cited pages and grounding queries. Public preview since February 2026, with more views added in June 2026 (blogs.bing.com, not opened in full).

## llms.txt

Sources: https://llmstxt.org/ (v2, header dated 2024-09-03), https://llmstxt.org/changes.html (v2, August 2026)

- Proposed by Jeremy Howard (Answer.AI) in September 2024. Hosted at github.com/AnswerDotAI/llms-txt as an informal proposal. It's not a standards-body spec.
- Location: `/llms.txt` or any subpath. "A file covers the URLs under its path", and agents use the most specific file.
- Format, in order: optional BOM; an H1 with the site name ("the only required section"); a blockquote summary; optional paragraphs or lists; H2 sections of `[name](url): notes` link lists. An `## Optional` section holds links an agent can skip. In v2 it has no special meaning to tools.
- Markdown page versions: same URL with `.md` appended (`page.html.md`) or replacing the extension (`page.md`). Discovery (new in v2): `rel="alternate" type="text/markdown"` and `rel="describedby"`, as `<link>` elements or an HTTP `Link:` header.
- `llms-full.txt` doesn't appear in the proposal. It's a convention some sites and platforms use, such as nextjs.org/docs/llms-full.txt.
- Intended for inference: "llms.txt information is instead used on demand". It's not an access control and doesn't replace robots.txt.
- Adoption, as the proposal states it: "thousands of sites publish an llms.txt file". OpenAI, Anthropic and Gemini publish one for their developer docs. Mintlify, GitBook, Yoast, AIOSEO and Wix generate them.

### What vendors say

- Google Search ignores it: "Google Search itself doesn't use them". Having one "will neither harm nor help your site's visibility or rankings" (ai-optimization-guide, 2026-06-15 note).
- Chrome Lighthouse has an llms.txt audit under agentic browsing (https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt, updated 2026-05-05). A server error fails it; a 404 is "Not Applicable" since "providing the file is optional at the moment." So one Google product checks for the file while Google Search ignores it.
- Statements by Google staff (John Mueller: "no AI system currently uses llms.txt"; Gary Illyes saying Google won't support it) are known only from secondhand reports. Unconfirmed from a primary source.
- OpenAI, Anthropic, Perplexity, Microsoft, Apple: I found no doc saying their crawlers or answer engines read llms.txt (unconfirmed). Publishing an llms.txt for your own developer docs isn't the same as a product reading other sites' files.
- Next.js publishes llms.txt, llms-full.txt and `.md` page versions, and answers `Accept: text/markdown` (bundled `02-guides/ai-agents.md`).

## How AI answers choose and cite sources

- Google: AI features are "rooted in our core Search ranking and quality systems". Grounding retrieves pages from the Search index, and fan-out queries widen the set of links (ai-optimization-guide).
- Bing: grounding selection favors content that stands on its own, keeps a URL to one topic, defines entities and puts key information early. Duplicate URLs "reduce Bing's confidence in selecting a URL for grounding results or citations" (webmaster guidelines).
- OpenAI: ChatGPT search "sometimes partners with other search providers" and rewrites the user's question into targeted queries; "Responses that use web search may include citations." (https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt, updated about 2026-10-20). The help page doesn't name the partners.
- OpenAI publisher FAQ (help.openai.com/en/articles/12627856) now redirects to the "ChatGPT Atlas retirement" article. I couldn't read its earlier guidance (OAI-SearchBot for inclusion, `utm_source=chatgpt.com` on referrals) from a primary source today, so those points are unconfirmed.
- Perplexity: the bots page only says PerplexityBot exists to "surface and link websites". I found no primary doc on how Perplexity ranks or cites sources (unconfirmed).
- Anthropic: blocking Claude-SearchBot or Claude-User reduces visibility in Claude's search. No doc on how sources are chosen (unconfirmed).

## AI usage preferences: standards

### IETF AI Preferences WG (aipref)

Sources: https://datatracker.ietf.org/wg/aipref/about/, https://datatracker.ietf.org/wg/aipref/documents/

- Charter: "standardize building blocks that allow for the expression of preferences". Chairs Mark Nottingham and Suresh Krishnan. Milestone to send both drafts to the IESG: 2026-08-31. As of 2026-10-22 the datatracker shows them as WG documents headed for Proposed Standard; there is no RFC yet.
- `draft-ietf-aipref-vocab-08` (2026-09-14, Keller and Thomson). Categories and labels: AI Training `train-ai` ("modify the learned parameters of a generative AI model"), AI Use `ai-use` (input to a model, not directly provided by the user), Search `search` (direct users to the asset with a link; "does not include the use of assets to generate summaries"). Values are `y`/`n`. Missing means "unknown". Search overrides the other two categories.
- `draft-ietf-aipref-attach-05` (2026-08-19, Illyes of Google and Thomson of Mozilla; would update RFC 9309). It defines an HTTP `Content-Usage` header and a robots.txt `Content-Usage` rule, e.g. `Content-Usage: train-ai=n`, with an optional path prefix. Allow/Disallow controls acquisition and Content-Usage controls use. Preferences apply only to crawlable paths.
- No vendor doc I read says it honors `Content-Usage` yet (unconfirmed).

### Cloudflare Content Signals

Source: https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/ (updated 2026-10-22), contentsignals.org

- A `Content-signal:` line in robots.txt with `search`, `ai-input` (RAG, grounding, AI answers) and `ai-train`, each `yes` or `no`. The comment block calls `no` an express reservation of rights under Article 4 of EU Directive 2019/790.
- Being tested: `use=immediate | reference | full`. Managed robots.txt now emits `Content-signal: search=yes, ai-train=no, use=reference`.
- This is a Cloudflare proposal, separate from the IETF vocabulary (different labels: `ai-input` vs `ai-use`, `yes` vs `y`). No AI vendor doc I read commits to honoring it (unconfirmed).
- Google Search Console "may occasionally report `Syntax not understood`" for these lines. Cloudflare says it saw no crawl or SEO impact.

## Cloudflare features (site on Workers)

Sources: https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/ (updated 2026-07-01), …/managed-robots-txt/ (2026-10-22), https://developers.cloudflare.com/ai-crawl-control/ (2026-08-14), …/ai-crawl-control/features/pay-per-crawl/what-is-pay-per-crawl/ (2026-07-28)

- AI bot policies (Security Settings > Configure AI bot policies): three categories, Search, Agent and Training. Each can be set to Block (all pages), Block on pages with ads, or Allow. Blocks cover verified bots in the category plus similar unverified bots.
- Defaults: "On September 15, 2026", new domains block Training and Agent bots "on pages that display ads", while Search stays allowed. A site without ads is effectively unaffected by that default (inferred, unconfirmed). Mixed Search+Training crawlers are blocked by every "block training" setting. The legacy "Block AI bots" toggle was deprecated on 2026-09-15.
- Managed robots.txt (Bot Preference Sync): only active when that's on and at least one policy blocks. It prepends the Content Signals comments plus managed groups (example: `Disallow: /` for Amazonbot, Applebot-Extended, Bytespider, CCBot, ClaudeBot, Google-Extended, GPTBot, meta-externalagent) before the origin's robots.txt. All plans. "`robots.txt` compliance is voluntary"; use AI Crawl Control to enforce.
- Free-plan domains with no robots.txt of their own get the Content Signals Policy text served at `/robots.txt`. It defines the terms but sets no preferences.
- AI Crawl Control (formerly AI Audit, all plans): per-crawler allow/block, a robots.txt compliance view, enforcement rules for crawlers that ignore it.
- Pay per crawl: "currently in closed beta". Crawlers either send payment intent for an HTTP 200 or get "HTTP 402 Payment Required" with pricing. Cloudflare is Merchant of Record. WAF or Bot Management blocks override "charge".
- These are zone settings. Whether they also cover `*.workers.dev` hostnames isn't stated in the pages read (unconfirmed). This site uses a Workers custom domain, which sits in a zone.

## Next.js 16 (bundled docs, next 16.3.8)

Sources: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/robots.md`, `…/03-file-conventions/route.md`, `…/02-guides/backend-for-frontend.md`, `…/02-guides/ai-agents.md`, `…/03-file-conventions/public-folder.md`

- `rules` takes an array, one object per group. `userAgent` can be a string or an array (docs example: `['Applebot', 'Bingbot']`). Checked on a build: an array is written as consecutive `User-Agent` lines over one set of rules, which robots.txt reads as one group.
- `other` (added v16.3.0) passes non-standard per-agent directives through verbatim, scoped to that rule's group. "Next.js does not validate directive names or values". That is the way to emit `Content-Usage:` or `Content-signal:` lines from `robots.ts`.
- `robots.ts` "is a special Route Handler that is cached by default".
- Custom text files: Route Handlers can return "non-UI content"; the BFF guide lists `llms.txt` among custom endpoints and shows `app/rss.xml/route.ts`. So `app/llms.txt/route.ts` exporting `GET` that returns `new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })` serves `/llms.txt`. The content type for llms.txt is my suggestion; neither Next.js nor llmstxt.org specifies one.
- GET handlers default to dynamic since v15.0.0-RC. Use `export const dynamic = 'force-static'` or `revalidate` to prerender.
- A static file in `public/llms.txt` also works, but `public` gets `Cache-Control: public, max-age=0`.

## This site (learn.huyle.work)

- `src/app/robots.ts`: one group, `{ userAgent: "*", allow: "/" }`, plus `sitemap: ${SITE_URL}/sitemap.xml`. No AI-specific rules. The comment explains `/api/` stays crawlable; `next.config.ts` sends `X-Robots-Tag: noindex` on `/api/:path*` and `/seo-lab/:path*`.
- Live check on 2026-10-22: `https://learn.huyle.work/robots.txt` returns only Cloudflare's Content Signals Policy comment block, with no `User-Agent`, rules or `Sitemap` line. `/sitemap.xml` and `/seo/*` return 404 and `/llms.txt` returns 404. The deployed build looks older than the robots/sitemap commit (f291974), so Cloudflare is serving its Free-plan default. Requests with GPTBot, ClaudeBot and Googlebot user agents to `/` all got 200, so nothing is blocking those agents at the edge.
- Deploy: OpenNext on Cloudflare Workers, custom domain `learn.huyle.work` (`wrangler.jsonc`).
