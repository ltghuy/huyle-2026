import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref, type TopicSlug } from "@/practices/catalog";

import { InteractionDemo } from "./interaction-demo";
import { LinksDemo } from "./links-demo";
import { MetadataAudit } from "./metadata-audit";
import { RenderDemo } from "./render-demo";
import { StrategyDemo } from "./strategy-demo";

const JS_DOCS = "https://developers.google.com/search/docs/crawling-indexing/javascript";
const NEXT_DOCS = "https://nextjs.org/docs/app";

const TOPICS = [
  { id: "rendering", title: "How crawlers handle JavaScript" },
  { id: "strategies", title: "Choosing a rendering strategy" },
  { id: "metadata", title: "Metadata in the server HTML" },
  { id: "links-routing", title: "Links, routing and soft 404s" },
  { id: "interaction", title: "Content behind interaction" },
] as const;

const inline = "rounded-sm font-medium text-link underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

function PageLink({ slug, children }: { slug: TopicSlug; children: React.ReactNode }) {
  return (
    <Link href={topicHref(slug)} className={inline}>
      {children}
    </Link>
  );
}

export function JavascriptSeoHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          &quot;Google runs JavaScript&quot; and &quot;client rendering hurts SEO&quot; are both partly true. Google renders pages in a recent Chrome,
          but rendering can wait, the renderer never clicks or scrolls, and many other crawlers read only the first HTML. This page explains what
          each kind of crawler gets from a JavaScript app, which rendering strategy each kind of page needs, and the app patterns that hide content
          or links. This site has small lab pages, one per pattern, kept out of search with a header; the demos fetch their server HTML and render them
          in your browser to compare. It builds on <PageLink slug="how-search-works">How search works</PageLink> and{" "}
          <PageLink slug="crawling-indexing">Crawling and indexing control</PageLink>.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            Google handles a JavaScript page in three phases: it crawls the URL, queues it for rendering, then indexes what the rendered page holds.
            The queue can take seconds or longer, and what the renderer can do is limited.
          </>
        }
        points={[
          <>
            The renderer is a recent Chrome. It doesn&apos;t click, type or scroll, declines permission prompts, and clears local storage, session
            storage and cookies between pages. It doesn&apos;t keep WebSocket or WebRTC connections either.
          </>,
          <>
            A page with <code>noindex</code> may not be rendered at all, so JavaScript that removes <code>noindex</code> can&apos;t be relied on.
          </>,
          <>
            Bing renders some JavaScript; link previews (Slack, X, Facebook) and many AI crawlers read only the server HTML. Content that matters
            should be in it.
          </>,
          <>
            Rendering also needs the page&apos;s JavaScript and API responses. Google caches those aggressively and may ignore cache headers, so
            fingerprint your asset file names.
          </>,
        ]}
        demoTitle="compare a lab page's server HTML with the rendered page"
        demo={<RenderDemo />}
        advice={[
          {
            do: <>Put the main content, title and description in the server HTML, and test pages with Search Console&apos;s URL Inspection tool.</>,
            avoid: <>Relying on rendering for content that has to rank, or on JavaScript to change robots rules.</>,
          },
        ]}
        links={[
          { label: "Google: JavaScript SEO basics", href: `${JS_DOCS}/javascript-seo-basics` },
          { label: "Google: fix JavaScript issues in Search", href: `${JS_DOCS}/fix-search-javascript` },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            The strategy decides what the first HTML holds. For search, the question is whether a page&apos;s content is complete in that HTML, and how
            fresh it needs to be.
          </>
        }
        points={[
          <>
            Static generation and static with revalidation send complete HTML from a cache: the best case for crawlers and the cheapest to serve.
            Server rendering sends complete, current HTML at the cost of work on every request. Client rendering sends a shell.
          </>,
          <>
            Personal content can&apos;t rank anyway, since crawlers aren&apos;t signed in. Render the public part on the server and fetch the personal
            part in the browser.
          </>,
          <>
            In Next.js the route picks the strategy: static by default, <code>export const revalidate</code> for periodic rebuilds, request-time APIs
            such as <code>connection()</code> or <code>cookies()</code> for server rendering, and <code>&quot;use client&quot;</code> components for
            browser-only parts. With Cache Components on, <code>&quot;use cache&quot;</code> takes the place of <code>revalidate</code>.
          </>,
          <>
            Serving crawlers a different, pre-rendered version (dynamic rendering) was a workaround; Google recommends server, static or hydrated
            rendering instead. Every handbook page on this site is static.
          </>,
        ]}
        demoTitle="answer three questions and get a strategy"
        demo={<StrategyDemo />}
        advice={[
          {
            do: <>Choose per route, and per component inside a route: a static page with a small client island is often the right answer.</>,
            avoid: <>Client-rendering a whole public site, or server-rendering every request for content that changes once a week.</>,
          },
        ]}
        links={[
          { label: "Google: dynamic rendering as a workaround", href: `${JS_DOCS}/dynamic-rendering` },
          { label: "Next.js: incremental static regeneration", href: `${NEXT_DOCS}/guides/incremental-static-regeneration` },
          { label: "web.dev: rendering on the web", href: "https://web.dev/articles/rendering-on-the-web" },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            Titles, descriptions and canonical URLs are only reliable when they&apos;re in the HTML the server sends. Google can read tags that
            JavaScript sets; link previews and most other crawlers can&apos;t.
          </>
        }
        points={[
          <>
            In Next.js, export <code>metadata</code> from a page or layout, or <code>generateMetadata</code> when it depends on data. A title{" "}
            <code>template</code> in the root layout (<code>&quot;%s · Frontend Handbook&quot;</code> here) keeps every page consistent.
          </>,
          <>
            For dynamic routes, Next.js streams metadata: the page starts sending before <code>generateMetadata</code> finishes, and the tags arrive
            in the <code>&lt;body&gt;</code>. Crawlers that run JavaScript read them there. For crawlers known not to (the <code>htmlLimitedBots</code>{" "}
            list, matched by user agent), it waits and puts them in <code>&lt;head&gt;</code>.
          </>,
          <>
            Static routes resolve metadata at build time, so it&apos;s in <code>&lt;head&gt;</code> for everyone. That&apos;s the case for every page
            on this site.
          </>,
          <>
            Every indexable page needs its own title and description. Duplicates make results look alike and are a sign that a template isn&apos;t
            filling them in.
          </>,
        ]}
        demoTitle="check the metadata of every page on this site"
        demo={<MetadataAudit />}
        advice={[
          {
            do: <>Build titles and descriptions from the page&apos;s data in one helper, and check them in the server HTML in CI.</>,
            avoid: <>Setting <code>document.title</code> in an effect, or the same description on every page.</>,
          },
        ]}
        links={[
          { label: "Next.js: generateMetadata and streaming metadata", href: `${NEXT_DOCS}/api-reference/functions/generate-metadata` },
          { label: "Next.js: htmlLimitedBots", href: `${NEXT_DOCS}/api-reference/config/next-config-js/htmlLimitedBots` },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            Single-page apps change what&apos;s on screen without a new request, which is fine for people. Crawlers still need a real URL for every
            page, a real link to reach it, and a truthful answer when it doesn&apos;t exist.
          </>
        }
        points={[
          <>
            Only <code>&lt;a href&gt;</code> with a real URL is followed. Next.js <code>&lt;Link&gt;</code> renders one. Buttons that call{" "}
            <code>router.push()</code>, spans with click handlers and <code>javascript:</code> URLs aren&apos;t links to a crawler.
          </>,
          <>
            Use the History API, which Next.js routing does, not fragments: everything after <code>#</code> is the same URL to a crawler.
          </>,
          <>
            A &quot;not found&quot; view sent with a 200 is a soft 404. Either return a real 404 (in Next.js, <code>notFound()</code> on the server),
            or add <code>noindex</code> to the error view.
          </>,
          <>Lists that load more on scroll need paginated URLs as well, each linked from the previous one, so crawlers can reach every item.</>,
        ]}
        demoTitle="check the lab's links and missing-product pages"
        demo={<LinksDemo />}
        advice={[
          {
            do: <>Use <code>&lt;Link href&gt;</code> for navigation, give every view its own path, and decide &quot;not found&quot; on the server.</>,
            avoid: <>Navigation built from buttons, <code>#/</code> routes, and error screens that answer 200.</>,
          },
        ]}
        links={[
          { label: "Google: crawlable links", href: "https://developers.google.com/search/docs/crawling-indexing/links-crawlable" },
          { label: "Google: soft 404s in single-page apps", href: `${JS_DOCS}/javascript-seo-basics` },
          { label: "Next.js: notFound", href: `${NEXT_DOCS}/api-reference/functions/not-found` },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            Google indexes what is in the rendered page without any interaction. Content in the DOM counts even when it&apos;s visually hidden;
            content that only arrives after a click or a scroll doesn&apos;t exist for a crawler.
          </>
        }
        points={[
          <>
            Text inside a closed <code>&lt;details&gt;</code>, an inactive tab panel or a collapsed accordion is in the DOM, so it&apos;s read.
          </>,
          <>
            Text fetched when a button is clicked, or when the page fires a <code>scroll</code> event, is never requested by a renderer that
            doesn&apos;t click or scroll.
          </>,
          <>
            Lazy loading that triggers when content enters the viewport (<code>IntersectionObserver</code>, or <code>loading=&quot;lazy&quot;</code>{" "}
            on images) works with Google&apos;s renderer, which doesn&apos;t rely on scrolling.
          </>,
          <>
            For &quot;load more&quot; lists, keep a paginated URL behind every chunk. Tabs whose panels load on click should render all panels on
            the server and hide the inactive ones.
          </>,
        ]}
        demoTitle="render the interaction lab, then click and scroll it"
        demo={<InteractionDemo />}
        advice={[
          {
            do: <>Render content that should rank into the DOM up front and hide it with CSS or <code>&lt;details&gt;</code> if needed.</>,
            avoid: <>&quot;Load more&quot; buttons and scroll handlers as the only way to reach content.</>,
          },
        ]}
        links={[
          { label: "Google: fix lazy-loaded content", href: `${JS_DOCS}/lazy-loading` },
          { label: "Google: URL Inspection tool", href: "https://support.google.com/webmasters/answer/9012289" },
        ]}
      />
    </div>
  );
}
