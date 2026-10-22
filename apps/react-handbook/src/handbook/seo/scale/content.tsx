import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref, type TopicSlug } from "@/practices/catalog";

import { CasesDemo } from "./cases-demo";
import { FacetsDemo } from "./facets-demo";
import { HreflangDemo } from "./hreflang-demo";
import { MigrationDemo } from "./migration-demo";
import { TestsDemo } from "./tests-demo";

const DOCS = "https://developers.google.com/search/docs";
const CRAWLING = "https://developers.google.com/crawling/docs";

const TOPICS = [
  { id: "international", title: "International sites" },
  { id: "migrations", title: "Site migrations" },
  { id: "facets", title: "Faceted navigation and pagination" },
  { id: "content-at-scale", title: "Content at scale" },
  { id: "monitoring", title: "Monitoring and automated checks" },
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

export function SeoAtScaleHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          On a large site one template produces thousands of URLs, the site exists in several languages, a redesign moves every page, and a lost
          canonical tag shows up in the reports a month after it shipped. This page covers what goes wrong at that size: hreflang, migrations,
          filters and pagination, pages generated in bulk, and how to monitor crawling and test SEO automatically. This site now checks its own SEO
          in its end-to-end suite on every run, and the last topic shows that spec and its recorded results.
        </p>
        <p>
          It assumes the earlier pages, especially <PageLink slug="crawling-indexing">Crawling and indexing control</PageLink> for status codes,
          robots rules and canonical URLs.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            hreflang tells Google which pages are translations or regional versions of each other, so it can show the right one to each searcher. The
            links can go in the HTML head, an HTTP header or the sitemap; Google treats the three the same.
          </>
        }
        points={[
          <>
            Each version lists itself and every other version, and links must go both ways: if two pages don&apos;t point to each other, Google
            ignores the pair. <code>x-default</code> names the page for everyone else, such as a language picker.
          </>,
          <>
            Codes are an ISO 639-1 language with an optional region, such as <code>de</code> or <code>fr-CA</code>. A country alone is invalid, and
            Google ignores <code>UK</code> (the code is <code>GB</code>). URLs must be absolute. Google detects a page&apos;s language from its content,
            not from hreflang or <code>lang</code>.
          </>,
          <>
            Don&apos;t redirect by guessed locale: Googlebot mostly crawls from the US without an <code>Accept-Language</code> header, so it would only
            ever see one version. Google prefers ccTLDs, subdomains or subdirectories over a locale parameter.
          </>,
          <>
            In Next.js, a page&apos;s <code>alternates</code> replaces the layout&apos;s, so a page that sets only its canonical drops the hreflang
            links. The docs&apos; localized sitemap example leaves out each page&apos;s own entry, and the types accept <code>en-UK</code>.
          </>,
        ]}
        demoTitle="check an hreflang cluster"
        demo={<HreflangDemo />}
        advice={[
          {
            do: <>Build every version&apos;s alternates from one list of locales, including the page itself, and check the cluster in a test.</>,
            avoid: <>Adding a language without updating the others, or sending visitors to a locale by their IP.</>,
          },
        ]}
        links={[
          { label: "Google: localized versions", href: `${DOCS}/specialty/international/localized-versions` },
          { label: "Google: multi-regional sites", href: `${DOCS}/specialty/international/managing-multi-regional-sites` },
          { label: "Google: locale-adaptive pages", href: `${DOCS}/specialty/international/locale-adaptive-pages` },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            A migration changes URLs for many pages at once: a new domain, a new structure or a new platform. Search keeps its signals when every old
            URL redirects to its new equivalent, and loses them for every URL that doesn&apos;t.
          </>
        }
        points={[
          <>
            Map every old URL first, from the sitemap, analytics, server logs and the CMS. Redirect each with a server-side 301 or 308 straight to
            its final URL; chains waste crawls. Old pages with no equivalent should answer 404 or 410.
          </>,
          <>
            Keep the redirects for at least a year. Update canonicals, hreflang, internal links and sitemaps to the new URLs, and check the new site
            isn&apos;t blocked by robots.txt or <code>noindex</code>.
          </>,
          <>
            For a new domain, Search Console&apos;s Change of Address tool helps for 180 days. It works per domain and doesn&apos;t move subdomains,
            including www. Expect rankings to move around for a few weeks or more on a medium site.
          </>,
          <>
            This site did a small move: the practices went from <code>/practices</code> to <code>/react-practices</code>, with two permanent
            redirects in <code>next.config</code>, where <code>permanent: true</code> sends a 308.
          </>,
        ]}
        demoTitle="check a redirect map, and this site's own redirects"
        demo={<MigrationDemo />}
        advice={[
          {
            do: <>Test the redirect map before launch, then watch crawl errors and traffic on old and new URLs for weeks after.</>,
            avoid: <>Redirecting every old URL to the home page, temporary redirects for a permanent move, or removing redirects after a few months.</>,
          },
        ]}
        links={[
          { label: "Google: site moves with URL changes", href: `${DOCS}/crawling-indexing/site-move-with-url-changes` },
          { label: "Google: redirects", href: `${DOCS}/crawling-indexing/301-redirects` },
          { label: "Google: Change of Address tool", href: "https://support.google.com/webmasters/answer/9370220" },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            Filters for colour, size and brand turn one listing into thousands of URLs. Crawlers fetch many of them before learning they&apos;re
            useless, and have less time left for pages that matter.
          </>
        }
        points={[
          <>
            If filtered pages don&apos;t need to be in search, keep crawlers out with a robots.txt rule for the filter parameters, or put filters after{" "}
            <code>#</code>, which Google doesn&apos;t crawl. <code>nofollow</code> only works if every link has it, and a canonical is a weaker hint.
          </>,
          <>
            If they do, use standard <code>&amp;</code>-separated parameters in one fixed order, never repeat a filter, and answer 404 for
            combinations with no results instead of an empty page.
          </>,
          <>
            Pagination: give each page its own URL, link the pages with real links, and let each page be its own canonical. Google no longer uses{" "}
            <code>rel=&quot;next&quot;</code> and <code>rel=&quot;prev&quot;</code>. Infinite scroll needs the same linked pages behind it.
          </>,
          <>
            Large catalogues can add images and videos to the sitemap. Google reads only <code>image:loc</code> for images today, and a video entry
            needs a thumbnail, a title, a description and a content or player URL.
          </>,
        ]}
        demoTitle="pick filters and a strategy and see the URL a crawler gets"
        demo={<FacetsDemo />}
        advice={[
          {
            do: <>Decide which filtered pages deserve search traffic, make only those crawlable, and normalize every filter link.</>,
            avoid: <>Empty filter pages that answer 200, or letting the click order decide the URL.</>,
          },
        ]}
        links={[
          { label: "Google: faceted navigation", href: `${DOCS}/crawling-indexing/crawling-managing-faceted-navigation` },
          { label: "Google: pagination and incremental loading", href: `${DOCS}/specialty/ecommerce/pagination-and-incremental-page-loading` },
          { label: "Google: image sitemaps", href: `${DOCS}/crawling-indexing/sitemaps/image-sitemaps` },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            Generating pages from data is normal: product pages, docs, listings. Google&apos;s spam policies target pages made mainly to rank, and
            they apply however the pages were produced.
          </>
        }
        points={[
          <>
            Scaled content abuse is many pages made to manipulate rankings, &quot;no matter how it&apos;s created&quot;: unreviewed AI output,
            scraped and reworded posts, or keyword pages that make no sense to a reader.
          </>,
          <>
            Doorway abuse is pages made to rank for similar searches that lead to the same place, like one page per town with only the name changed.
            Site reputation abuse is third-party content hosted to borrow the host&apos;s ranking without its oversight.
          </>,
          <>
            Google says appropriate use of AI or automation isn&apos;t against its guidelines and asks for every AI-written fact to be checked. Its
            questions for any page are who made it, how, and why; the why matters most.
          </>,
          <>The helpful content system became part of Google&apos;s core ranking in March 2024, so a site with lots of unhelpful pages can suffer as a whole.</>,
        ]}
        demoTitle="sort cases of generated pages"
        demo={<CasesDemo />}
        advice={[
          {
            do: <>Generate pages only where each has its own data a reader would want, and review what a model writes.</>,
            avoid: <>One page per keyword or town from one template, or publishing a partner&apos;s pages you don&apos;t edit.</>,
          },
        ]}
        links={[
          { label: "Google: spam policies", href: `${DOCS}/essentials/spam-policies` },
          { label: "Google: helpful content", href: `${DOCS}/fundamentals/creating-helpful-content` },
          { label: "Google: generative AI content", href: `${DOCS}/fundamentals/using-gen-ai-content` },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            Search reports show a problem weeks after it ships. Server logs and the Crawl Stats report show crawling as it happens, and tests stop
            regressions before they ship.
          </>
        }
        points={[
          <>
            Verify Googlebot before trusting a log line: a reverse DNS lookup must end in <code>googlebot.com</code>, <code>google.com</code> or{" "}
            <code>googleusercontent.com</code> and resolve back to the same address, or match Google&apos;s published IP files, which change often.
          </>,
          <>
            Crawl Stats in Search Console groups requests by response, file type, purpose (discovery or refresh) and Googlebot type. Crawl budget
            matters for sites with a million or more pages, or ten thousand that change daily. To slow crawling in an emergency, answer 503 or 429,
            for no more than a day or two.
          </>,
          <>
            In end-to-end tests, read pages as text the way a crawler does and assert status codes, one H1, titles, descriptions, canonicals,
            robots rules, structured data and redirects for every sitemap URL. The URL Inspection API only reports the indexed version, at 2,000
            requests a day, so it can&apos;t test a build.
          </>,
          <>
            Lighthouse&apos;s SEO audits cover crawlability, title, description, status code, link text, robots.txt, image alt, hreflang and canonical.
            IndexNow notifies Bing, Yandex and others of changes; Google doesn&apos;t use it.
          </>,
        ]}
        demoTitle="this site's SEO tests and their last recorded run"
        demo={<TestsDemo />}
        advice={[
          {
            do: <>Run SEO assertions against the production build for every sitemap URL, with messages that name the page.</>,
            avoid: <>Waiting for Search Console to report a lost canonical, or trusting user agents in logs.</>,
          },
        ]}
        links={[
          { label: "Google: verifying Googlebot", href: `${CRAWLING}/crawlers-fetchers/verify-google-requests` },
          { label: "Google: crawl budget", href: `${CRAWLING}/crawl-budget` },
          { label: "Search Console: Crawl Stats report", href: "https://support.google.com/webmasters/answer/9679690" },
          { label: "IndexNow", href: "https://www.indexnow.org/documentation" },
        ]}
      />
    </div>
  );
}
