---
topic: seo-fundamentals
checked: 2026-10-22
used-by: ["041"]
---

# SEO fundamentals: what Google documents

Primary sources only. Quotes are verbatim from the pages, checked on 2026-10-22.

## Pipeline

Source: https://developers.google.com/search/docs/fundamentals/how-search-works

- Three stages: crawling, indexing, serving search results. Google finds URLs from links on known pages, from sitemaps, and from pages it has visited before.
- "Google doesn't guarantee that it will crawl, index, or serve your page." "Indexing isn't guaranteed; not every page that Google processes will be indexed."
- Rendering: Google renders pages with a recent version of Chrome and runs their JavaScript during crawling.
- Indexing groups similar pages into clusters and picks the most representative one as the canonical. "The canonical is the page that may be shown in search results."
- "Google doesn't accept payment to crawl a site more frequently, or rank it higher."

## Page indexing report reasons (Search Console)

Source: https://support.google.com/webmasters/answer/7440203 (H4 headings, verbatim)

Not indexed: Server error (5xx) · Redirect error · URL blocked by robots.txt · URL marked ‘noindex’ · Soft 404 · Blocked due to unauthorized request (401) · Not found (404) · Blocked due to access forbidden (403) · URL blocked due to other 4xx issue · Crawled - currently not indexed · Discovered - currently not indexed · Alternate page with proper canonical tag · Duplicate without user-selected canonical · Duplicate, Google chose different canonical than user · Page with redirect

Warning: Indexed, though blocked by robots.txt · Page indexed without content

Indexed: Page is indexed

Older blog posts use "Blocked by robots.txt" and "Excluded by 'noindex' tag"; use the current names.

## robots.txt and noindex

Source: https://developers.google.com/search/docs/crawling-indexing/robots/intro

- robots.txt "is not a mechanism for keeping a web page out of Google".
- A blocked URL "can still appear in search results, but the search result won't have a description".
- "To keep a web page out of Google, block indexing with noindex or password-protect the page." (A crawler has to fetch the page to see `noindex`, so it can't be combined with a robots.txt block.)

## Crawlable links

Source: https://developers.google.com/search/docs/crawling-indexing/links-crawlable

- "Google can only crawl your link if it's an `<a>` HTML element" with "an `href` attribute".
- Not recommended: `<a routerLink=…>`, `<span href=…>`, `<a onclick=…>`, `href="javascript:…"`.
- Use `nofollow` "only when you don't trust the source". Google treats `nofollow`, `sponsored` and `ugc` as hints since 2019 (Google Search Central blog, "Evolving 'nofollow'", 2019-09-10).

## Duplicates and canonicals

Source: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls

- Redirects: "A strong signal that the target of the redirect should become canonical."
- `rel="canonical"`: "A strong signal that the specified URL should become canonical."
- Sitemap inclusion: "A weak signal that helps the URLs that are included in a sitemap become canonical."
- "Google prefers HTTPS pages over equivalent HTTP pages as canonical", unless something is wrong (invalid certificate, or the HTTPS page's canonical points to HTTP). URLs in hreflang clusters are preferred too.
- None of the methods is required; combining them increases the chance the preferred URL is shown.

## Ranking claims

Sources: https://developers.google.com/search/docs/fundamentals/seo-starter-guide, https://developers.google.com/search/docs/appearance/page-experience

- "Google Search doesn't use the keywords meta tag."
- "The length of the content alone doesn't matter for ranking purposes."
- Keywords in the domain or URL path "alone have hardly any effect beyond appearing in breadcrumbs."
- E-E-A-T as a ranking factor: "No, it's not." (It's a framework in the quality rater guidelines.)
- Headings: no "magical, ideal amount"; order doesn't matter for ranking.
- "We have many ranking signals, and PageRank is just one of those."
- "Core Web Vitals are used by our ranking systems." But "Google Search always seeks to show the most relevant content, even if the page experience is sub-par."
- HTTPS: announced as a lightweight ranking signal (Google Search Central blog, "HTTPS as a ranking signal", 2014-08-06).

## Search Console performance metrics

Source: https://support.google.com/webmasters/answer/7576553

- Clicks: "The number of times a user clicked your site from Google Search results."
- Impressions: "How many times your site appeared in Search results."
- CTR: "The click count divided by the impression count."
- Average position: "The average position of the topmost result from your site." Two results from one site for one query count as one impression in the chart total. Results are personalised by time, place, device and history.

## Crawl budget

Source: https://developers.google.com/crawling/docs/crawl-budget

- For "Large sites (1 million+ unique pages)" changing about weekly, "Medium or larger sites (10,000+ unique pages)" changing daily, or sites with many "Discovered - currently not indexed" URLs. Otherwise "you don't need to read this guide". The numbers are "a rough estimate".

## robots.txt rules (Google)

Source: https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt (checked 2026-10-22)

- Group choice: "the group with the most specific user agent that matches the crawler's user agent"; user-agent names are case-insensitive; matching groups for the same agent are combined.
- Rule choice: "the most specific rule based on the length of the rule path"; "In case of conflicting rules, including those with wildcards, Google uses the least restrictive rule."
- `*` is "0 or more instances of any valid character"; `$` "designates the end of the URL". Paths are case-sensitive and start with `/`.
- Size limit 500 KiB; the rest is ignored. Cached "up to 24 hours".
- Status of robots.txt itself: 3xx followed for at least five hops, then treated as 404; 4xx (except 429) means no restrictions; 5xx stops crawling for 12 hours, then the last cached copy is used for up to 30 days.
- `Sitemap:` lines aren't tied to a user agent and must be absolute URLs; several are allowed.

## Sitemaps (Google)

Source: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap

- "50MB (uncompressed) or 50,000 URLs" per sitemap; split larger sites and use a sitemap index.
- "Google ignores `<priority>` and `<changefreq>` values."
- `<lastmod>` should be "the last significant update"; Google uses it only if it's consistently accurate.
- "Use fully-qualified, absolute URLs"; list the canonical URLs you want in results.
- Reference from robots.txt with a `Sitemap:` line, or submit in Search Console.

## Robots meta tag and X-Robots-Tag (Google)

Source: https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag

- Rules: all (default), noindex, nofollow, none (= noindex, nofollow), nosnippet, indexifembedded (only with noindex), max-snippet:N (0 none, -1 no limit), max-image-preview:none|standard|large, max-video-preview:N, notranslate, noimageindex, unavailable_after:date. noarchive, nocache and nositelinkssearchbox are no longer used.
- Use the X-Robots-Tag header for non-HTML files. Rules combine; "the more restrictive rule applies" on conflict. The URL must not be blocked in robots.txt or the rules are never read.

## HTTP status codes (Google)

Source: https://developers.google.com/search/docs/crawling-indexing/http-network-errors

- "Google's crawlers follow up to 10 redirect hops."
- 301 and 308: "a strong signal that the redirect target should be processed"; 302 and 307: "a weak signal".
- "All 4xx errors, except 429, are treated the same": indexed URLs returning 4xx are removed; crawl frequency for them drops.
- 429 and 5xx slow crawling; URLs that keep failing are eventually dropped; crawling speeds up again once 2xx returns.
- Soft 404: an error message or empty page served with 2xx.

## Next.js 16 behaviour (bundled docs)

- `app/robots.ts` and `app/sitemap.ts` are special route handlers, cached by default.
- `metadataBase` lets URL fields such as `alternates.canonical` be relative; it's usually set in the root layout. A field set in a layout is inherited by every page below that doesn't set its own.
- `notFound()`, `forbidden()` and `unauthorized()` inject `<meta name="robots" content="noindex">`; so does a streamed 404 that already sent a 200 status.

## JavaScript SEO (Google)

Sources: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics, …/javascript/lazy-loading, …/javascript/fix-search-javascript, …/javascript/dynamic-rendering (checked 2026-10-22)

- Three phases: crawling, rendering, indexing. "Googlebot queues pages for both crawling and rendering"; a page "may stay on this queue for a few seconds, but it can take longer than that."
- "When Google encounters the `noindex` tag, it may skip rendering and JavaScript execution", so removing `noindex` with JavaScript may not work.
- "Use the History API instead of fragments"; don't use fragments to load different content.
- JavaScript can set or change the title and meta description (for Google).
- Soft 404s in apps: redirect with JavaScript to a URL that returns 404, or add `noindex` to the error view with JavaScript.
- "Googlebot caches aggressively"; WRS "may ignore caching headers"; fingerprint assets.
- "server-side or pre-rendering is still a great idea" because "not all bots can run JavaScript."
- "Expect Googlebot to decline user permission requests." Local and session storage and cookies "are cleared across page loads." No WebSockets or WebRTC.
- Lazy loading: load content "whenever it is visible in the viewport" (IntersectionObserver works); methods "don't rely on user actions, such as scrolling or clicking", because "Google Search does not interact with your page." Infinite scroll: give each chunk "its own persistent, unique URL" and link them sequentially.
- Dynamic rendering "was a workaround and not a long-term solution"; Google recommends "server-side rendering, static rendering, or hydration".

## Next.js streaming metadata (bundled docs)

- With async `generateMetadata`, Next.js streams the UI first and appends the metadata tags to `<body>` when they resolve; verified with bots that run JavaScript such as Googlebot.
- For HTML-limited bots (detected by user agent; default list includes AdsBot-Google, Mediapartners-Google, Bingbot, Twitterbot, Slackbot), metadata blocks rendering and lands in `<head>`. `htmlLimitedBots` in next.config overrides the list; `/.*/` disables streaming metadata.
- Static routes resolve metadata at build time, so it's in `<head>` for everyone.

## Title links and snippets (Google)

Sources: https://developers.google.com/search/docs/appearance/title-link, …/appearance/snippet (checked 2026-10-22)

- Title link sources: `<title>`, the main visual title, headings such as `<h1>`, `og:title`, other large and prominent text, other page text, anchor text on the page, text of links pointing to the page, `WebSite` structured data.
- No length limit; "truncated in Google Search results as needed, typically to fit the device width."
- Rewrites happen for: half-empty titles, outdated dates, titles that don't match the page, repeated boilerplate, several big headings with no main title, a different language, a repeated site name.
- Snippets: "Google primarily uses the content on the page"; it "sometimes uses the meta description". No length limit; cut to fit the device. Controls: `nosnippet`, `max-snippet`, `data-nosnippet`.

## Structured data (Google)

Sources: …/appearance/structured-data/article, …/structured-data/breadcrumb, …/structured-data/sd-policies, …/structured-data/search-gallery

- Article types: Article, NewsArticle, BlogPosting. "There are no required properties"; recommended: author (name, url), dateModified, datePublished (ISO 8601 with time zone), headline, image (relevant images; 16x9, 4x3 and 1x1; at least 50K pixels).
- BreadcrumbList: `itemListElement` of `ListItem` with `position` (1 is the start), `name`, `item` (URL); the last item may omit `item`.
- Formats: JSON-LD (recommended), Microdata, RDFa. "Don't mark up content that is not visible to readers of the page." No guarantee of rich results. Spammy markup can bring a structured data manual action, which removes rich result eligibility.
- Gallery on 2026-10-22: Article, Breadcrumb, Carousel, Course list, Dataset, Discussion forum, Education Q&A, Employer aggregate rating, Event, Image metadata, Job posting, Local business, Math solver, Movie, Organization, Product, Profile page, Q&A, Recipe, Review snippet, Software app, Speakable, Subscription and paywalled content, Vacation rental, Video. FAQ and HowTo aren't listed (cut back in August 2023: FAQ limited to well-known government and health sites, HowTo removed).

## Next.js metadata, images, JSON-LD (bundled docs)

- Metadata from segments is "shallowly merged"; nested fields such as `openGraph` and `robots` from a layout are "overwritten by the last segment to define them". Share them through a variable.
- `ImageResponse` (next/og): Satori + Resvg, flexbox and a CSS subset (no grid), 500 KB bundle limit, ttf/otf/woff fonts, 1200 × 630 by default.
- JSON-LD: render `<script type="application/ld+json">` in a page or layout; escape `<` as `<` because `JSON.stringify` doesn't sanitize.
