import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref, type TopicSlug } from "@/practices/catalog";

import { CanonicalDemo } from "./canonical-demo";
import { ClaimsDemo } from "./claims-demo";
import { CrawlDemo } from "./crawl-demo";
import { CrawlerView } from "./crawler-view";
import { PipelineDemo } from "./pipeline-demo";
import { SkillMap } from "./skill-map";

const DOCS = "https://developers.google.com/search/docs";

const TOPICS = [
  { id: "pipeline", title: "From URL to search result" },
  { id: "discovery", title: "How pages are found" },
  { id: "crawler-view", title: "What a crawler reads" },
  { id: "canonical", title: "Duplicate URLs and the canonical" },
  { id: "ranking", title: "Ranking and measuring" },
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

export function HowSearchWorksHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          A search engine can only show a page it has found, fetched, understood and kept. SEO is the work of making each of those steps go right, then
          making the page the best answer for the people searching. Much of the first part is frontend work: status codes, links, rendering and the
          tags in the HTML. This page sets up the model the rest of the SEO section uses, with Google as the reference engine because it documents the
          most. Each later page sets up for real on this site the part it explains, starting with{" "}
          <PageLink slug="crawling-indexing">robots.txt, the sitemap and canonical URLs</PageLink>. The crawler view below fetches this site&apos;s real
          pages; the other demos are models, with their assumptions shown.
        </p>
      </div>

      <SkillMap />

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            Google describes three stages: crawling, indexing and serving results. Splitting crawling into finding the URL, fetching it and rendering it
            gives five places where a page can drop out, each with its own fix.
          </>
        }
        points={[
          <>
            <strong>Discover</strong>: the crawler learns a URL from a link on a page it already knows, or from a sitemap. You control this with
            crawlable links and <PageLink slug="crawling-indexing">the sitemap</PageLink>.
          </>,
          <>
            <strong>Crawl</strong>: it checks robots.txt, fetches the URL, and reads the status code and HTML. Status codes, redirects, robots.txt rules
            and server speed all act here.
          </>,
          <>
            <strong>Render</strong>: Google runs the page in a recent Chrome so content added by JavaScript is seen.{" "}
            <PageLink slug="javascript-seo">JavaScript and rendering SEO</PageLink> covers what that costs and which crawlers skip it.
          </>,
          <>
            <strong>Index</strong>: the content is analysed, grouped with duplicates, one URL in each group is chosen as the canonical, and it&apos;s
            stored. <code>noindex</code>, canonical tags and the content itself decide what happens.
          </>,
          <>
            <strong>Serve</strong>: for each search, matching pages are ranked for that query and that person. Titles, descriptions and{" "}
            <PageLink slug="metadata-structured-data">structured data</PageLink> shape how the result looks.
          </>,
          <>Google says plainly that none of this is guaranteed: not every page it processes gets indexed, and it doesn&apos;t accept payment to crawl or rank.</>,
        ]}
        demoTitle="give a page problems and see where it stops"
        demo={<PipelineDemo />}
        advice={[
          {
            do: <>Diagnose stage by stage: was the URL found, could it be fetched, did it render, why wasn&apos;t it indexed. Search Console&apos;s Page indexing report names the stage.</>,
            avoid: <>Blocking a page in robots.txt to remove it from search. The crawler then can&apos;t see a <code>noindex</code>, and the URL can stay indexed without a description.</>,
          },
        ]}
        links={[
          { label: "Google: how Search works", href: `${DOCS}/fundamentals/how-search-works` },
          { label: "Search Console: Page indexing report", href: "https://support.google.com/webmasters/answer/7440203" },
          { label: "Google: robots.txt introduction", href: `${DOCS}/crawling-indexing/robots/intro` },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            Crawlers find pages by following links from pages they already know, and by reading sitemaps. A page that nothing links to, and that no
            sitemap lists, is invisible to them however good it is.
          </>
        }
        points={[
          <>
            Google only reliably follows an <code>&lt;a&gt;</code> element with an <code>href</code>. A <code>div</code> or button that calls{" "}
            <code>router.push()</code> works for people and leaves no URL for a crawler. Next.js <code>&lt;Link&gt;</code> renders a real{" "}
            <code>&lt;a href&gt;</code>, which is one reason to use it.
          </>,
          <>Links that only appear after a click, such as a menu built on open, aren&apos;t in the HTML the crawler reads.</>,
          <>
            <code>rel=&quot;nofollow&quot;</code> asks crawlers not to follow a link. Google treats it as a hint. Use it for links you don&apos;t vouch
            for, never for your own navigation.
          </>,
          <>
            Click depth matters: pages a few clicks from the home page get found and recrawled sooner. Crawl budget, the limit on how much Google
            fetches, only becomes a concern for sites with tens of thousands of pages that change daily, or a million that change weekly.
          </>,
        ]}
        demoTitle="change how this site links and see what a crawler finds"
        demo={<CrawlDemo />}
        advice={[
          {
            do: <>Link to every page from at least one crawlable page, keep important pages within a few clicks of home, and publish a sitemap for the rest.</>,
            avoid: <>Navigation built from click handlers, or a sitemap used to make up for pages your own links never reach.</>,
          },
        ]}
        links={[
          { label: "Google: crawlable links", href: `${DOCS}/crawling-indexing/links-crawlable` },
          { label: "Google: sitemaps overview", href: `${DOCS}/crawling-indexing/sitemaps/overview` },
          { label: "Google: crawl budget", href: "https://developers.google.com/crawling/docs/crawl-budget" },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            On its first fetch, a crawler gets the HTML your server sends, before any script runs. That HTML decides what most crawlers know about the
            page: its title, description, canonical URL, robots rules, headings, links and text.
          </>
        }
        points={[
          <>
            Google renders pages later and sees content added by JavaScript, but rendering can wait in a queue. Many other crawlers, including many AI
            crawlers, read only the first HTML.
          </>,
          <>
            The <code>&lt;title&gt;</code> and meta description are what search results usually show. The canonical link and the robots meta tag (or
            the <code>X-Robots-Tag</code> header) tell the crawler which URL to keep and whether to index it.
          </>,
          <>
            With no robots rule at all, the default is <code>index, follow</code>. There is no need to add it.
          </>,
          <>
            This site renders on the server, so the HTML already holds each page&apos;s text. Since <PageLink slug="crawling-indexing">Crawling and indexing control</PageLink>, every page also sends its canonical URL. Since{" "}
            <PageLink slug="metadata-structured-data">Metadata and structured data</PageLink>, it sends social card tags and JSON-LD too.
          </>,
        ]}
        demoTitle="read any page of this site the way a crawler does"
        demo={<CrawlerView />}
        advice={[
          {
            do: <>Check the server HTML (view source, or a fetch like the one above) for the title, description, canonical and main content.</>,
            avoid: <>Judging crawlability from the browser&apos;s element inspector, which shows the page after scripts have run.</>,
          },
        ]}
        links={[
          { label: "Google: JavaScript SEO basics", href: `${DOCS}/crawling-indexing/javascript/javascript-seo-basics` },
          { label: "Google: robots meta tag and X-Robots-Tag", href: `${DOCS}/crawling-indexing/robots-meta-tag` },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            The same content often answers at several URLs. A search engine groups them, picks one as the canonical to show, and folds the signals of
            the others into it. You can say which one you prefer; it decides.
          </>
        }
        points={[
          <>
            Usual causes: HTTP and HTTPS, with and without <code>www</code>, a trailing slash, letter case, tracking parameters like{" "}
            <code>?utm_source=</code>, sort and filter parameters, and print or session URLs.
          </>,
          <>
            Redirects and <code>rel=&quot;canonical&quot;</code> are strong signals, a sitemap entry is a weak one, and consistent internal links help.
            Google also prefers HTTPS over HTTP.
          </>,
          <>
            These are hints the engine weighs, so they can lose. When yours loses, Search Console reports{" "}
            <q>Duplicate, Google chose different canonical than user</q>.
          </>,
          <>A canonical tag is for copies of the same content. Pointing every page of a series at page one, or at the home page, is a common mistake that Google may ignore.</>,
        ]}
        demoTitle="set the URL variants and signals, and see which URL wins"
        demo={<CanonicalDemo />}
        advice={[
          {
            do: <>Pick one URL format, redirect the others to it, give every page a self-referencing canonical, and use the same URL in links and the sitemap.</>,
            avoid: <>Signals that disagree, such as a canonical to one URL while the sitemap and internal links use another.</>,
          },
        ]}
        links={[
          { label: "Google: consolidate duplicate URLs", href: `${DOCS}/crawling-indexing/consolidate-duplicate-urls` },
          { label: "Google: what canonicalization is", href: `${DOCS}/crawling-indexing/canonicalization` },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            Ranking systems look at how well a page matches what the searcher wants, how helpful and reliable its content is, its page experience, the
            links pointing to it, and the searcher&apos;s context: place, language, device. Search Console reports the results in four numbers.
          </>
        }
        points={[
          <>
            <strong>Impressions</strong>: how often a page from your site appeared in results. An impression doesn&apos;t mean anyone saw it; it may
            have been far down the page.
          </>,
          <>
            <strong>Clicks</strong> and <strong>CTR</strong> (clicks divided by impressions): a low CTR at a good position often means the title or
            description doesn&apos;t match what people searched for.
          </>,
          <>
            <strong>Average position</strong>: the average of your topmost result&apos;s position. It mixes very different queries, so read it per query
            and page, never as a site score.
          </>,
          <>
            Results are personalised by time, place, device and history, so checking your own ranking in a browser says little. Rankings also move
            for reasons outside your site: competitors, new result features, and updates to the ranking systems.
          </>,
        ]}
        demoTitle="sort common SEO claims"
        demo={<ClaimsDemo />}
        advice={[
          {
            do: <>Measure against the same queries and pages over time, and compare trends with your releases and with known ranking updates.</>,
            avoid: <>Optimising for a tag or a number the search engine has said it ignores, such as meta keywords or a word count.</>,
          },
        ]}
        links={[
          { label: "Search Console: Performance report", href: "https://support.google.com/webmasters/answer/7576553" },
          { label: "Google: ranking systems guide", href: `${DOCS}/appearance/ranking-systems-guide` },
          { label: "Google: creating helpful content", href: `${DOCS}/fundamentals/creating-helpful-content` },
        ]}
      />
    </div>
  );
}
