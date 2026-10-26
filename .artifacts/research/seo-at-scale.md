---
topic: seo-at-scale
checked: 2026-10-22
used-by: ["046"]
---

# SEO at scale: what Google, Bing and the specs document

Primary sources only (Google Search Central docs and help center, Bing Webmaster docs, protocol sites, bundled Next.js docs). Quotes are verbatim and under 15 words, checked on 2026-10-22. "Unconfirmed" marks anything a primary source didn't state. Basics already in `seo-fundamentals.md` (robots.txt matching, status codes, sitemap limits, crawl budget audience, lazy loading) and `ai-search.md` (AI crawlers, IndexNow for Copilot freshness) aren't repeated except where a detail matters here.

## International sites

### hreflang (Google)

Source: https://developers.google.com/search/docs/specialty/international/localized-versions (updated 2026-09-21)

- Three methods: `<link rel="alternate" hreflang="…" href="…">` in `<head>`, an HTTP `Link:` header (useful for PDFs and other non-HTML files), or `<xhtml:link>` children of each `<url>` in a sitemap (namespace `http://www.w3.org/1999/xhtml`). "The three methods are equivalent from Google's perspective."
- Self-reference: "Each language version must list itself as well as all other language versions."
- Return links: "If two pages don't both point to each other, the tags will be ignored."
- `x-default`: "used when no other language/region matches the user's browser setting". Designed for language selector pages, usable for any fallback page.
- Codes: language in ISO 639-1, optional region in ISO 3166-1 Alpha 2, optional script in ISO 15924 (`zh-Hant`, `zh-Hans`). Case-insensitive. "You can't specify the country code by itself." Region codes such as `EU`, `UN` or `UK` are ignored (the UK code is `GB`).
- Alternate URLs must be fully qualified with the protocol (`https://example.com/foo`, never `//example.com/foo` or `/foo`).
- "Google doesn't use hreflang or the HTML lang attribute to detect the language of a page."
- Localized versions "are only considered duplicates if the main content" stays untranslated.
- The page doesn't call hreflang a hint or a directive. It says Google may still find alternates without annotations and may ignore broken ones.
- Common mistakes listed: missing return links, wrong language codes (region-only), wrong region codes.
- Canonical interplay: `seo-fundamentals.md` already records that URLs in hreflang clusters are preferred as canonical. Each language version should be its own canonical; same-language regional duplicates pick a preferred URL with `rel="canonical"` plus hreflang (next section).

Source: https://support.google.com/webmasters/answer/12474899

- The International Targeting report in Search Console is deprecated. "Google will continue to support and use hreflang tags on your pages." Country targeting in Search Console "is no longer supported". (Deprecation date not shown on the page; unconfirmed here.)

### URL structures and locale signals (Google)

Source: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites (updated 2025-12-10)

| Structure | Example | Pros (per Google) | Cons (per Google) |
|-----------|---------|-------------------|-------------------|
| ccTLD | `example.de` | Clear geotargeting, server location irrelevant, easy separation | Expensive, availability, more infrastructure, one country only, strict ccTLD rules |
| Subdomain on gTLD | `de.example.com` | Easy setup, can use different server locations, easy separation | Users can't tell if "de" means language or country |
| Subdirectory on gTLD | `example.com/de/` | Easy setup, low maintenance (one host) | Geotargeting unclear from URL, one server location, harder to separate |
| URL parameters | `site.com?loc=de` | None listed | Not recommended: hard to segment, geotargeting unclear |

- Locale signals: ccTLDs (vanity ccTLDs such as `.tv` and `.me` are treated as gTLDs), hreflang, server IP location (weak, because of CDNs), local addresses, phone numbers, currency, links from local sites, Business Profile.
- Ignored: `geo.position`, `distribution` and other locational meta tags. For language: "We don't use any code-level language information such as `lang` attributes".
- "Avoid automatically redirecting" users based on a guessed language; link to the other versions so people and crawlers can reach all of them. IP-based adaptation is unreliable and may block crawling of variants.
- One language per page; "avoid side-by-side translations." Translating boilerplate but leaving the main content (for example UGC) in one language gives a poor result.

### Locale-adaptive pages (Google)

Source: https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages (updated 2025-12-10)

- Locale-adaptive means the site "returns different content based on the perceived country or preferred language".
- Googlebot's default IPs "appear to be based in the USA" (it also crawls from other countries).
- The crawler sends requests "without setting `Accept-Language` in the request header."
- Recommendation: separate locale URLs annotated with hreflang. So a proxy that redirects `/` by `Accept-Language` sends Googlebot to whatever the no-header default is.

### Bing and hreflang

- Bing's current Webmaster Guidelines (https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a, no date shown, read 2026-10-22) don't mention hreflang, `content-language` or language targeting at all.
- The often-cited Bing post saying Bing uses the `content-language` meta tag (blogs.bing.com, March 2011, "How To Tell Bing Your Website's Country and Language") now returns 404. Search snippets of it say: meta tag first, then `<html lang>`, then `<title lang>`. Unconfirmed against a live Bing source.
- "Bing does not use hreflang" is repeated by SEO blogs only. Unconfirmed. Safe advice: hreflang for Google plus a correct `<html lang>`; a `content-language` meta is harmless but has no current Bing documentation.

### Next.js 16 (bundled docs, next 16.3.8)

Sources: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`, `…/03-file-conventions/01-metadata/sitemap.md`, `…/02-guides/internationalization.md`, `node_modules/next/dist/lib/metadata/types/alternative-urls-types.d.ts`

- `alternates.languages: { 'en-US': '/en-US', 'de-DE': '/de-DE' }` renders `<link rel="alternate" hreflang="en-US" href="https://acme.com/en-US" />`. Relative values resolve against `metadataBase`; a relative URL without `metadataBase` is a build error. So hreflang hrefs come out absolute as Google requires.
- The `Languages` type accepts `'x-default'` as a key (`type UnmatchedLang = 'x-default'`), plus common codes and any `${Lowercase<string>}-${string}`. The type doesn't enforce Google's ISO rules: `'en-UK'` type-checks.
- Sitemap entries take `alternates.languages` and emit `<xhtml:link rel="alternate" hreflang=… href=…>` with the `xmlns:xhtml` namespace.
- Gotcha: the docs' sitemap example lists only `es` and `de` alternates under the English `<loc>`, with no entry for the page itself or `x-default`. Google requires each version to list itself, so add the `<loc>`'s own language (and `x-default` if used) to `languages`.
- Metadata is shallowly merged, so `alternates` set in a layout is replaced by any page that sets `alternates` (for example only `canonical`), which silently drops hreflang. Build both in one helper.
- i18n guide: locale routing by sub-path (`/fr/products`) or domain (`my-site.fr`), detection from `Accept-Language` in `proxy.ts` and a redirect when the path has no locale, all routes under `app/[lang]`. Combined with Google's guidance: keep that redirect only for locale-less paths, never between existing locale URLs, and give each locale page a link to the others.

## Site migrations

### Moves with URL changes (Google)

Source: https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes (updated 2026-08-20)

- Steps: general best practices, prepare and test the new site, prepare a URL mapping, start the move, monitor both old and new URLs.
- Mapping: "It's important to map your old site's URLs to the URLs for the new site." Sources for old URLs: sitemaps, analytics, server logs, CMS.
- Redirects: "Use server side permanent redirects if technically possible" (301 or 308). Client-side redirects are a last resort.
- Old URLs with no equivalent should return 404 or 410 on the new site.
- Duration: keep redirects "for as long as possible, generally at least 1 year." Consider keeping them indefinitely for users.
- Chains: "Avoid chaining redirects." "we advise redirecting to the final destination directly".
- New URLs get a "self-referencing" canonical; update hreflang to the new URLs; update internal links; check `noindex` and robots.txt on the new site.
- Sitemaps: submit the new one; keeping both during monitoring helps track the shift.
- Timing: small and medium sites should move all at once ("moving all URLs on your site simultaneously"); large sites may move in sections.
- Expect "ranking fluctuations while Google recrawls and reindexes your site". For a medium-sized site "it can take a few weeks or more" for new URLs to show; larger sites take longer. "rankings will settle down over time." No fixed number is given beyond that.
- After a move Google "will temporarily crawl your new site more heavily than usual".

### Change of Address tool (Search Console)

Source: https://support.google.com/webmasters/answer/9370220 (no date shown)

- Only for domain or subdomain changes, at the domain-property level. Not for HTTP to HTTPS, www to non-www, path changes within a site, or hosting changes.
- Needs a 301 from the old home page to the new one, and ownership of both properties.
- "The tool does not move any subdomains below the specified domain (including www)."
- Effects "continue for 180 days"; keep redirects at least that long. Google prioritizes crawling the new site and forwards signals, but doesn't remove the old site from the index.

### Moves without URL changes (Google)

Source: https://developers.google.com/search/docs/crawling-indexing/site-move-no-url-changes (updated 2025-12-10)

- Covers switching hosting providers or moving to a CDN.
- Lower DNS TTL "at least a week in advance"; remove robots.txt blocks from the new copy; check firewalls and DoS protection don't block Googlebot (test with URL Inspection); keep verification files.
- "a temporary drop in Googlebot's crawl rate immediately after the launch" is normal, then a steady increase over a few days. Shut down the old host when its traffic reaches zero in the logs.

### Redirect types (Google, Bing)

Source: https://developers.google.com/search/docs/crawling-indexing/301-redirects (updated 2026-04-14)

- Permanent: HTTP 301, 308, `meta refresh` with 0 seconds, JavaScript `location`. Temporary: 302, 303, 307, `meta refresh` over 0 seconds.
- Permanent: the pipeline uses the redirect as a signal the target "should be canonical". Temporary: it doesn't.
- "Only use JavaScript redirects if you can't do server-side or `meta refresh` redirects."
- Google follows up to 10 hops (see `seo-fundamentals.md`).

Source: Bing Webmaster Guidelines (URL above)

- "Use 301 redirects for permanent URL changes". "Use 302 redirects only for very short-term changes (less than 2 days)". "Use redirects instead of canonical tags" when content moves. Bing doesn't mention 308 there; whether Bing treats 308 like 301 is unconfirmed.

### Next.js 16 redirects (bundled docs)

Sources: `…/05-config/01-next-config-js/redirects.md`, `…/02-guides/redirecting.md`

- `permanent: true` sends 308, `false` sends 307. Next.js uses them to preserve the request method. `statusCode` can replace `permanent` for old clients; a `Refresh` header is added to 308 for IE11.
- Order: `redirects` runs before the filesystem (pages and `/public`) and before Proxy.
- Platforms may cap the list ("on Vercel, there's a limit of 1,024 redirects"). For 1000+ redirects the docs suggest Proxy reading a data store, with a Bloom filter checked first and a Route Handler for the real lookup.
- Path params need the `/` before `:` or the source is literal, risking infinite redirects.
- 308 is permanent for Google (table above), so `permanent: true` is the right setting for migration redirects.

## Faceted navigation

Source: https://developers.google.com/search/docs/crawling-indexing/crawling-managing-faceted-navigation (updated 2025-12-18). Announced in "Crawling December: Faceted navigation", Tuesday, December 17, 2024 (https://developers.google.com/search/blog/2024/12/crawling-december-faceted-nav): "We just published a new document about faceted navigation best practices".

- Problem: crawlers fetch many filter URLs before learning they're useless ("overcrawling"), so they "have less time to spend on new, useful URLs."
- If filtered URLs don't need indexing, prevent crawling:
  - robots.txt, for example `disallow: /*?*color=` while allowing one unfiltered listing. "there's no good reason to allow crawling of filtered items" in most cases.
  - URL fragments: Google Search "generally doesn't support URL fragments in crawling and indexing", so filters after `#` aren't crawled.
  - `rel="nofollow"` works only if "every anchor pointing to a specific URL" has it.
  - `rel="canonical"` to the unfiltered page is weaker and may reduce crawling over time.
- If they must be indexable:
  - Use "the industry standard URL parameter separator '&'" (not commas or semicolons).
  - Keep filter order consistent in paths and prevent duplicate filters.
  - Return 404 for combinations with no results, duplicates, nonsense combos and nonexistent pagination, at the URL itself. Don't redirect to a generic error page.
  - Canonicalize filtered URLs to a simpler version where it makes sense.

### Pagination and infinite scroll

Source: https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading (updated 2025-12-10)

- Link pages sequentially with `<a href>`; Google doesn't click buttons or reliably run JavaScript that needs user action.
- Each page gets its own URL (`?page=n`); "Google ignores fragment identifiers."
- "Don't use the first page of a paginated sequence as the canonical page." Each page canonicalizes to itself.
- Google no longer uses `rel="next"`/`rel="prev"`; other engines may.
- Titles and descriptions may repeat across the sequence.
- Keep filtered or re-sorted variants out of the index with `noindex` or robots.txt.
- Load more and infinite scroll: content loaded only on user action must also be reachable through linked URLs. Infinite scroll chunks need persistent unique URLs (see the lazy-loading notes in `seo-fundamentals.md`).
- The page doesn't mention "view-all" pages (older advice; unconfirmed for current docs).

## Programmatic and large-scale content

Source: https://developers.google.com/search/docs/essentials/spam-policies (updated 2026-08-28)

- Scaled content abuse: "many pages are generated for the primary purpose of manipulating search rankings". Covers "large amounts of unoriginal content", "no matter how it's created." Examples: "Using generative AI tools or other similar tools to generate many pages" without added value; scraping feeds or search results (including synonymizing or translating); stitching content from other pages; multiple sites to hide scale; keyword pages that make no sense to readers.
- Doorway abuse: pages "created to rank for specific, similar search queries"; for example pages that funnel visitors to the real content. Typical programmatic risk: one template times every city or keyword with no unique substance.
- Site reputation abuse: third-party content "published on a host site mainly because of that host's already-established ranking signals". Not abuse: wire and press release services, syndicated news, UGC, a clearly labeled and integrated coupons section built with a partner. Reviewers look for enough host "editorial oversight, or contribution" to count as integrated. (The "regardless of first-party involvement" wording from Google's November 2024 blog isn't on the current page; unconfirmed here.)
- Also relevant: expired domain abuse, thin affiliation (copied merchant descriptions), scraping.

Source: https://developers.google.com/search/docs/fundamentals/creating-helpful-content (updated 2026-10-05)

- "People-first content means content that's created primarily for people". Warning signs include "using extensive automation to produce content on many topics" and "producing lots of content on many different topics".
- Who, How, Why; "Why" is "perhaps the most important question". Word count: "(No, we don't.)"

Source: https://developers.google.com/search/docs/appearance/ranking-systems-guide (updated 2025-12-10)

- The helpful content system "became part of our core ranking systems" in March 2024 and is listed as retired.

Source: https://developers.google.com/search/blog/2023/02/google-search-and-ai-content (Wednesday, February 8, 2023)

- "Rewarding high-quality content, however it is produced". "Appropriate use of AI or automation is not against our guidelines." Automation "with the primary purpose of manipulating ranking" is spam.

Source: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content (updated 2026-10-01)

- "It is critical to manually factcheck and review all AI-generated content". The same applies to titles, meta descriptions, structured data and alt text.
- Consider disclosing how content was made. Merchant Center requires AI images to carry IPTC `DigitalSourceType` `TrainedAlgorithmicMedia`.

Source: Bing Webmaster Guidelines (URL above)

- Bing lists "Automatically Generated Content at Scale": large-scale content made "without oversight, quality control, or editorial review" may lose visibility.

## Log analysis and crawl monitoring

### Verifying Googlebot

Source: https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests (updated 2026-03-20)

- Manual: reverse DNS on the log IP with `host`, check the name ends in `googlebot.com`, `google.com` or `googleusercontent.com`, then forward DNS on that name must return the same IP.
- Patterns: common crawlers `crawl-***-***-***-***.googlebot.com` or `geo-crawl-….geo.googlebot.com`; special-case crawlers `rate-limited-proxy-….google.com`; user-triggered fetchers `….gae.googleusercontent.com` or `google-proxy-….google.com`.
- Automatic: match against JSON (CIDR) files under `https://developers.google.com/static/crawling/ipranges/`: `common-crawlers.json` (Googlebot), `special-crawlers.json` (AdsBot and similar), `user-triggered-fetchers.json`, `user-triggered-fetchers-google.json`, `user-triggered-agents.json`. Other Google IPs: `https://www.gstatic.com/ipranges/goog.json`.
- Checked 2026-10-22: the old `…/static/search/apis/ipranges/googlebot.json` returns 301 to `…/static/crawling/ipranges/common-crawlers.json`; all five files have `creationTime` 2026-10-21, so they're regenerated often. Fetch them on a schedule, don't hard-code ranges.

### Verifying Bingbot

Source: https://www.bing.com/webmasters/help/verify-bingbot-2195837f (no date shown)

- The Verify Bingbot tool checks one IP (in Webmaster Tools, or public at `bing.com/toolbox/verify-bingbot`).
- `https://www.bing.com/toolbox/bingbot.json` exists and returns CIDR prefixes (checked 2026-10-22, `creationTime` 2024-01-03). The help page read here doesn't link it; reverse DNS to `search.msn.com` is widely cited but wasn't in the part of the page read. Both unconfirmed against Bing's text.

### Crawl Stats report (Search Console)

Source: https://support.google.com/webmasters/answer/9679690 (no date shown)

- Only for root-level properties (Domain property or root URL-prefix).
- Totals: total crawl requests (including failed ones), total download size, average response time.
- Host status: robots.txt fetching, DNS resolution, server connectivity. States: no significant issues in 90 days, issues more than a week ago, a recent issue. Each chart has a threshold line (example: DNS failing on more than 5% of requests in a day).
- By response, grouped: good (200, 301/308, 302/307, other moved such as meta refresh, 304), possibly good (404), bad (robots.txt not available, 401/407, 5xx, other 4xx, DNS unresponsive, DNS error, fetch error, page could not be reached, page timeout, redirect error, other error).
- By file type: HTML, Image, Video, JavaScript, CSS, PDF, Other XML, JSON, Syndication, Audio, Geographic data, Other file type, Unknown (Failed).
- By purpose: Discovery "was never crawled by Google before"; Refresh "A recrawl of a known page."
- By Googlebot type: Smartphone, Desktop, Image, Video, Page resource load, AdsBot, StoreBot, Other agent type.
- The default date range of the charts isn't stated on the page (unconfirmed; the host status window is 90 days).

### Crawl budget

Source: https://developers.google.com/crawling/docs/crawl-budget (updated 2026-07-22)

- Exact wording: "Large sites (1 million+ unique pages) with content that changes moderately often (once a week)" and "Medium or larger sites (10,000+ unique pages) with very rapidly changing content (daily)", plus sites with many "Discovered - currently not indexed" URLs. Numbers are "a rough estimate".
- Crawl budget is "the set of URLs that Google can and wants to crawl". Capacity limit "limits the total amount of time your server spends holding connections open". Demand depends on size, update frequency, quality, relevance.
- Practices: consolidate duplicates, block unimportant URLs in robots.txt, "Return a 404 or 410 status code for permanently removed pages", remove soft 404s, keep sitemaps and `lastmod` current, avoid long redirect chains, faster pages and 304 support.
- "Don't use noindex, as Google will still request, but then drop the page." "Don't use robots.txt to temporarily reallocate crawl budget."
- 5xx or 429 lower the capacity limit. More crawling: add server capacity or improve content; there's no request form for more.

### Reducing crawl rate in an emergency

Source: https://developers.google.com/crawling/docs/crawlers-fetchers/reduce-crawl-rate (updated 2026-10-06)

- Return 500, 503 or 429 instead of 200; 503 and 429 can carry `Retry-After`.
- Don't do it "longer than 1-2 days": URLs that keep failing over several days may drop from the index, and errors on many URLs slow the whole host. The rate recovers when errors stop.
- For unusually high crawl rates you can "file a special request"; you can't ask for more crawling.
- The Search Console crawl rate limiter tool was deprecated (blog title "Upcoming deprecation of Crawl Rate Limiter Tool in Search Console", 2023; date not re-read here).

### Bing crawl control

Source: https://www.bing.com/webmasters/help/crawl-control-55a30303 (no date shown)

- Set Bingbot's rate faster or slower "for each of the 24 hours in the day", with presets for the site's busy hours.
- "If we find a crawl-delay directive in your robots.txt file, then it will always take precedence". (Google ignores `crawl-delay`; that isn't restated on the pages read here.)
- Bing guidelines: crawl capacity depends on "site health, efficiency, signal quality, and crawl value"; block unnecessary crawl paths in robots.txt; avoid URLs "with numerous parameters".

## Automated SEO testing

### Google tools and APIs

- URL Inspection API (https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect, updated 2024-07-23): `POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect` with `inspectionUrl` and `siteUrl` (`sc-domain:` for Domain properties). "Presently only the status of the version in the Google index is available", so it can't test a live or staging URL.
- Quotas (https://developers.google.com/webmaster-tools/limits, updated 2025-08-28): URL Inspection 2,000 queries per day and 600 per minute per site; Search Analytics 1,200 per minute per site and per user. Search Analytics exposes at most 50K rows per day per search type (https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data).
- Rich Results Test: Google says to use it "during development", and the rich result status reports after deployment (https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data). No public Rich Results Test API was found (unconfirmed that none exists).
- Mobile-Friendly Test API: retired. "starting December 1, 2023, we'll be retiring" the Mobile Usability report, the Mobile-Friendly Test tool and API (https://developers.google.com/search/blog/2023/04/page-experience-in-search, April 19, 2023).
- No Google doc on running SEO checks in CI was found. Unconfirmed.

### Lighthouse SEO audits

Source: https://github.com/GoogleChrome/lighthouse/blob/main/core/config/default-config.js (main at v13.5.0, released 2026-09-18)

- SEO category audit IDs: `is-crawlable` (weighted so failing it fails the category), `document-title`, `meta-description`, `http-status-code`, `link-text`, `crawlable-anchors`, `robots-txt`, `image-alt`, `hreflang`, `canonical`; manual: `structured-data`.
- Not in the current list: `tap-targets`, `font-size`, `plugins`. Older versions had them in the SEO category (from memory; which version removed each is unconfirmed).
- Lighthouse also has an "agentic-browsing" category with `llms-txt` (see `ai-search.md`).
- Lighthouse CI (https://github.com/GoogleChrome/lighthouse-ci): "Automate running Lighthouse for every commit", with assertions to block regressions. It's the GoogleChrome-maintained CI route (config file details not re-read here).
- The `hreflang` audit checks codes are valid and hrefs absolute; it doesn't check return links across pages (unconfirmed detail; not re-read from the audit source).

### IndexNow

Sources: https://www.indexnow.org/documentation, https://www.indexnow.org/faq, https://www.indexnow.org/searchengines.json (read 2026-10-22)

- Ping `https://<searchengine>/indexnow?url=…&key=…`, or POST JSON `{ host, key, keyLocation?, urlList }`. "You can submit up to 10,000 URLs per post".
- Key: 8 to 128 characters of `a-z`, `A-Z`, `0-9`, `-`. Host it as UTF-8 `{key}.txt` at the root (recommended), or elsewhere on the host with `keyLocation` (then only URLs under that path count).
- Responses: 200 submitted, 202 accepted with key validation pending, 400 bad format, 403 key not valid, 422 URLs not on the host or key mismatch, 429 too many requests.
- Engines "agree to share URLs" with all others. `searchengines.json` lists bing, yandex, seznam, naver, yep, internetarchive, amazonbot. Google isn't listed and has no IndexNow documentation; Google support is unconfirmed (treat as no).
- Bing guidelines name IndexNow first among discovery methods and say to "Notify IndexNow when content is added, updated, or deleted."

## Image and video sitemaps (brief)

Sources: https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps (updated 2025-12-10), …/sitemaps/video-sitemaps (updated 2026-05-20), https://developers.google.com/search/docs/appearance/google-images (updated 2026-03-02)

- Image sitemap: namespace `http://www.google.com/schemas/sitemap-image/1.1`; only `<image:image>` and `<image:loc>`; up to 1,000 `<image:image>` per `<url>`. Images may live on another domain if it's verified and not blocked by robots.txt.
- Removed image tags: `<image:caption>`, `<image:geo_location>`, `<image:title>`, `<image:license>` (Google's "spring cleaning" of sitemap extensions, 2022; exact post date not re-read).
- Video sitemap required: `<video:video>`, `<video:thumbnail_loc>`, `<video:title>`, `<video:description>` (max 2048 characters), and `<video:content_loc>` or `<video:player_loc>` (content_loc preferred). Removed: `<video:category>`, `<video:gallery_loc>`, `autoplay`/`allow_embed` on `player_loc`, `<video:price>`, `<video:tvshow>`. Max 32 `<video:tag>`.
- Image SEO: Google finds images in `<img src>` (also inside `<picture>`); "Google doesn't index CSS images." Alt text is the most important image metadata. Formats: BMP, GIF, JPEG, PNG, WebP, SVG, AVIF. Always give `srcset`/`<picture>` an `src` fallback.
- Next.js: sitemap entries accept `images: string[]` and `videos: Videos[]`; `generateSitemaps` splits large sitemaps (the docs' comment: "Google's limit is 50,000 URLs per sitemap").

## Contradictions and things to flag

- Next.js docs' localized sitemap example omits the self-referencing hreflang Google requires.
- Next.js `Languages` type accepts codes Google ignores (`en-UK`, any `xx-*`).
- Bing guidelines say 301 for permanent moves and 302 under 2 days; Next.js `permanent: true` sends 308. Google treats 308 as 301. Bing's 308 handling isn't documented.
- Bing's hreflang stance has no live primary source either way.
- Inference, not a Google statement: an empty filter page served with 200 and an empty-state message is what Google's facet doc tells you to replace with a 404, and it's also what Google classes as a soft 404.
- Google says keep migration redirects "at least 1 year"; the Change of Address tool works for 180 days. Both apply; the year is the floor for redirects.

## This site (learn.huyle.work)

- `next.config.ts` `redirects()`: `/practices` → `/react-practices` and `/practices/:slug` → `/react-practices/:slug`, both `permanent: true` (308). Query strings pass through. A live migration example with a URL map of two rules and no chains.
- `next.config.ts` `headers()`: `X-Robots-Tag: noindex` on `/api/:path*` and `/seo-lab/:path*`. No hreflang anywhere: the site is English only, no `alternates.languages`, no `[lang]` segment.
- `src/app/sitemap.ts`: only built practices and written topic pages, `lastModified` from each page's `updated` date. No `alternates`, `images` or `videos`.
- E2E: `playwright.config.ts` runs two projects on Desktop Chrome 1280x900: `chromium` (`e2e/specs/*.spec.ts`) and `scenarios` (Gherkin in `e2e/features/*.feature` compiled by playwright-bdd into `.features-gen`). The web server is `pnpm build && pnpm start --port 3100`; CI uses 2 retries and `forbidOnly`. `pnpm test:e2e` = `bddgen && playwright test`.
- Specs today: ab-testing, accessible-modal, debounced-search, multi-step-form (POM and no-POM), toast-notifications; features: discount-codes, job-application. No SEO checks (no tests for status codes, canonical, robots meta, redirects or sitemap).
- Recording: `e2e/reporters/handbook-reporter.ts` (a Playwright `Reporter`) collects every test (project, file, line, describe, title, outcome, duration, retries, first error line) and on `onEnd` writes `src/handbook/e2e/last-run.json` (run time, duration, status, projects, Playwright version, totals) and `src/handbook/e2e/suite-files.json` (a copy of `playwright.config.ts` and every `.ts`/`.feature` under `e2e/`).
- Display: `src/handbook/e2e/suite.ts` imports both JSON files and exports `LAST_RUN` (null if none), `suiteFile(path)`, `recordedTest(file, title)` and `OUTCOME_LABEL`; `run-summary.tsx` renders the run as a table, used by the Testing handbook pages (`src/handbook/e2e/content.tsx`, `src/handbook/bdd/content.tsx`). Last recorded run: 2026-10-21, 24 passed, Playwright 1.64.1. An SEO spec added to `e2e/specs` would show up there automatically.
