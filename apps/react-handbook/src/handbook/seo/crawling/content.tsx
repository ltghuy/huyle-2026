import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref, type TopicSlug } from "@/practices/catalog";

import { CanonicalCheck } from "./canonical-check";
import { RobotsDemo } from "./robots-demo";
import { RulesDemo } from "./rules-demo";
import { SitemapDemo } from "./sitemap-demo";
import { StatusDemo } from "./status-demo";

const DOCS = "https://developers.google.com/search/docs";
const NEXT_DOCS = "https://nextjs.org/docs/app/api-reference";

const TOPICS = [
  { id: "robots-txt", title: "robots.txt" },
  { id: "sitemap", title: "The sitemap" },
  { id: "robots-rules", title: "noindex and other robots rules" },
  { id: "canonical-urls", title: "Canonical URLs in Next.js" },
  { id: "status-codes", title: "Status codes and redirects" },
] as const;

const inline = "rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

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

export function CrawlingIndexingHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          <PageLink slug="how-search-works">How search works</PageLink> showed where a page can drop out on its way to a search result. This page
          covers the controls you have over the first stages: which URLs crawlers may fetch, which pages you want indexed, which URL of each page is the
          real one, and what each response&apos;s status says about it. This site now uses every one of them, and the demos read its live robots.txt,
          sitemap, headers and HTML.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            robots.txt is a plain text file at the root of a host that says which paths each crawler may fetch. It controls crawling, not indexing: a
            blocked URL can still show up in results, without a description, if other pages link to it.
          </>
        }
        points={[
          <>
            Rules come in groups that start with <code>User-agent</code>. A crawler uses only the most specific group that names it, and falls back to{" "}
            <code>*</code>. A Googlebot group therefore replaces the <code>*</code> rules for Googlebot instead of adding to them.
          </>,
          <>
            Within the group, the longest matching <code>Allow</code> or <code>Disallow</code> path wins, and on a tie the less restrictive one does.{" "}
            <code>*</code> matches any characters, <code>$</code> marks the end of the URL, and paths are case-sensitive.
          </>,
          <>
            Google caches the file for up to a day. A missing file (404) means no rules; a failing one (5xx) pauses crawling of the whole site. Google
            reads up to 500 KiB and ignores <code>crawl-delay</code>.
          </>,
          <>
            This site&apos;s file allows everything and names the sitemap. It doesn&apos;t block <code>/api/</code>: pages fetch from it while they
            render, and a crawler blocked from those calls sees less of the page. A header keeps the API out of the index instead (topic 3).
          </>,
        ]}
        demoTitle="test robots.txt rules against a crawler and a URL"
        demo={<RobotsDemo />}
        advice={[
          {
            do: <>Keep the file short, block only what wastes crawls (endless filter or search URLs), and test each change before you deploy it.</>,
            avoid: <>Blocking pages to remove them from search, or blocking the CSS, JavaScript and API calls a page needs to render.</>,
          },
        ]}
        links={[
          { label: "Google: how robots.txt is interpreted", href: `${DOCS}/crawling-indexing/robots/robots_txt` },
          { label: "RFC 9309: Robots Exclusion Protocol", href: "https://www.rfc-editor.org/rfc/rfc9309" },
          { label: "Next.js: robots.ts", href: `${NEXT_DOCS}/file-conventions/metadata/robots` },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            A sitemap lists the URLs you want in search results, so crawlers can find them without following links. It helps most on new sites, large
            sites, and pages few links point to. Listing a URL is a suggestion, not a promise that it gets indexed.
          </>
        }
        points={[
          <>
            List only canonical, indexable URLs that answer 200: no redirects, no <code>noindex</code> pages, no URL variants. Every entry is a weak
            vote for that URL as the canonical, so a wrong entry sends a mixed signal.
          </>,
          <>
            Use absolute URLs. One file holds up to 50,000 URLs or 50 MB uncompressed; bigger sites split it and list the parts in a sitemap index.
          </>,
          <>
            Google ignores <code>priority</code> and <code>changefreq</code>. It uses <code>lastmod</code> only when it has proven accurate, so set it
            to the last real change of the content, never to the build time.
          </>,
          <>
            This site builds its sitemap in <code>app/sitemap.ts</code> from the same page list as the sidebar: built practices and written pages,
            each with its last content change. Placeholder pages are left out.
          </>,
        ]}
        demoTitle="read this site's sitemap and check every URL in it"
        demo={<SitemapDemo />}
        advice={[
          {
            do: <>Generate the sitemap from the same data as your routes, reference it in robots.txt, and submit it in Search Console to see its errors.</>,
            avoid: <>Writing it by hand, listing every URL with today&apos;s date as <code>lastmod</code>, or listing pages that redirect.</>,
          },
        ]}
        links={[
          { label: "Google: build and submit a sitemap", href: `${DOCS}/crawling-indexing/sitemaps/build-sitemap` },
          { label: "Next.js: sitemap.ts", href: `${NEXT_DOCS}/file-conventions/metadata/sitemap` },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            To keep a page out of search results, let crawlers fetch it and tell them <code>noindex</code>, in a robots meta tag or an{" "}
            <code>X-Robots-Tag</code> response header. Other rules limit what a result shows: the snippet, the image preview, or how long it stays.
          </>
        }
        points={[
          <>
            The meta tag works for HTML pages. The header works for any response, including PDFs, images and JSON, and is the only option for them.
          </>,
          <>Rules combine, and when two conflict the more restrictive one applies. A crawler has to fetch the URL to read either, so never block it in robots.txt too.</>,
          <>
            Some rules are no longer used: Google ignores <code>noarchive</code>, and <code>noindex</code> written inside robots.txt hasn&apos;t worked
            since 2019.
          </>,
          <>
            On this site: pages being written send <code>noindex, follow</code> from their metadata, every <code>/api/</code> response carries{" "}
            <code>X-Robots-Tag: noindex</code> from <code>next.config</code>, and Next.js adds <code>noindex</code> to every 404 page by itself.
          </>,
        ]}
        demoTitle="build a set of robots rules, then check what this site sends"
        demo={<RulesDemo />}
        advice={[
          {
            do: <>Use <code>noindex</code> for thin, private or duplicate pages you still need, and the header for non-HTML files.</>,
            avoid: <>Combining <code>noindex</code> with a robots.txt block, or using <code>nofollow</code> on your own pages to steer crawling.</>,
          },
        ]}
        links={[
          { label: "Google: robots meta tag and X-Robots-Tag", href: `${DOCS}/crawling-indexing/robots-meta-tag` },
          { label: "Google: block indexing with noindex", href: `${DOCS}/crawling-indexing/block-indexing` },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            Every indexable page should name itself as the canonical with an absolute URL. That answers the duplicate question up front for every
            variant a crawler might find: a trailing slash, a tracking parameter, a different host.
          </>
        }
        points={[
          <>
            In Next.js, set <code>metadataBase</code> once in the root layout, then give each page <code>alternates: {"{ canonical: \"/its/path\" }"}</code>.
            The relative path is resolved against the base.
          </>,
          <>
            Don&apos;t set the canonical in a shared layout. Metadata is inherited, so every page below that doesn&apos;t override it would name the
            layout&apos;s URL, and search engines would fold the whole section into one page.
          </>,
          <>
            This site sets it in the catalog helpers that every route already uses for its title, so a new page can&apos;t forget it. Next.js removes
            trailing slashes with a 308 redirect, and paths are case-sensitive.
          </>,
          <>
            Make the other signals agree with the canonical: internal links, the sitemap and redirects should all use the same URL. A canonical that
            disagrees with them can be overruled.
          </>,
        ]}
        demoTitle="request this page as four different URLs"
        demo={<CanonicalCheck />}
        advice={[
          {
            do: <>Give every indexable page a self-referencing absolute canonical, from one helper, and check it in the server HTML.</>,
            avoid: <>A canonical in the root layout, relative canonicals without <code>metadataBase</code>, or a canonical to a page with different content.</>,
          },
        ]}
        links={[
          { label: "Google: specify a canonical with rel=\"canonical\"", href: `${DOCS}/crawling-indexing/consolidate-duplicate-urls` },
          { label: "Next.js: metadataBase and alternates", href: `${NEXT_DOCS}/functions/generate-metadata#metadatabase` },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            The status code is the first thing a crawler reads, and it decides what happens next: index the content, follow a redirect, drop the URL or
            come back later. The code should tell the truth about the URL.
          </>
        }
        points={[
          <>
            301 and 308 are permanent: a strong signal that the target replaces the URL. 302 and 307 are temporary: a weak one, so the original usually
            stays indexed. Google follows up to 10 hops, but each hop costs a fetch, so redirect straight to the final URL.
          </>,
          <>
            404 and 410 are treated alike: the URL is dropped and crawled less often. A page that says &quot;not found&quot; with a 200 is a soft 404,
            and so is redirecting every deleted page to the home page.
          </>,
          <>
            429 and 5xx slow crawling down; URLs that keep failing are eventually dropped. For planned downtime send 503 with a{" "}
            <code>Retry-After</code> header.
          </>,
          <>
            In Next.js: <code>permanentRedirect()</code> (308), <code>redirect()</code> (307), <code>redirects</code> in <code>next.config</code>,
            and <code>notFound()</code> (404, with <code>noindex</code>). Other codes come from a route handler or <code>proxy</code>. A 404 found
            after streaming has started is sent as a 200 with <code>noindex</code>, which keeps it out of the index.
          </>,
        ]}
        demoTitle="pick the status code for each situation"
        demo={<StatusDemo />}
        advice={[
          {
            do: <>Map every old URL to its final new URL in one hop, return 404 or 410 for content that is really gone, and 503 for planned downtime.</>,
            avoid: <>Redirect chains, temporary redirects for permanent moves, and 200 responses for missing or broken pages.</>,
          },
        ]}
        links={[
          { label: "Google: HTTP status codes and network errors", href: `${DOCS}/crawling-indexing/http-network-errors` },
          { label: "Google: redirects and Google Search", href: `${DOCS}/crawling-indexing/301-redirects` },
          { label: "Google: crawl budget for large sites", href: "https://developers.google.com/crawling/docs/crawl-budget" },
        ]}
      />
    </div>
  );
}
