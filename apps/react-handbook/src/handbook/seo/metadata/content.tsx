import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref, type TopicSlug } from "@/practices/catalog";

import { CardDemo } from "./card-demo";
import { EditorDemo } from "./editor-demo";
import { JsonLdDemo } from "./jsonld-demo";
import { SerpDemo } from "./serp-demo";
import { SocialDemo } from "./social-demo";

const APPEARANCE = "https://developers.google.com/search/docs/appearance";
const NEXT_DOCS = "https://nextjs.org/docs/app";

const TOPICS = [
  { id: "title-links", title: "Title links and snippets" },
  { id: "social-cards", title: "Social cards" },
  { id: "card-images", title: "Generating card images" },
  { id: "structured-data", title: "Structured data on this site" },
  { id: "rich-results", title: "Rich results" },
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

export function MetadataHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          Once a page is indexed, what people see decides whether they click: the title and snippet in search results, the card when someone shares
          the link, and the extras structured data can add to a result. This page covers all three. This site now sends Open Graph and X card tags on
          every page, a card image generated for each one, and JSON-LD describing every handbook page, and the demos read them live. The previous page,{" "}
          <PageLink slug="javascript-seo">JavaScript and rendering SEO</PageLink>, explains why all of it has to be in the server HTML.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            The blue link in a result is the title link, and the text under it is the snippet. Google builds both itself, mostly from your{" "}
            <code>&lt;title&gt;</code> and your page&apos;s text, and cuts them to fit the screen.
          </>
        }
        points={[
          <>
            The title link usually comes from <code>&lt;title&gt;</code>, but Google also looks at the main heading, <code>og:title</code>, prominent
            text and link text pointing to the page. It rewrites titles that are empty, stale, boilerplate or don&apos;t match the page.
          </>,
          <>
            The snippet comes mostly from the page content that matches the query; the meta description is used when it describes the page better. A
            unique, specific description per page gives Google a good option.
          </>,
          <>
            Neither has a length limit, but both are cut by width: roughly 600 px for a desktop title. Put the words that matter first and the site name
            last, as this site&apos;s <code>&quot;%s · Frontend Handbook&quot;</code> template does.
          </>,
          <>
            <code>nosnippet</code>, <code>max-snippet</code> and the <code>data-nosnippet</code> attribute on an element control what may appear in the
            snippet.
          </>,
        ]}
        demoTitle="preview a page's result and edit its title and description"
        demo={<SerpDemo />}
        advice={[
          {
            do: <>Write a distinct, descriptive title and description for each page, from the page&apos;s data, with the key words early.</>,
            avoid: <>Keyword lists, the same description on every page, or a template that leaves &quot;Home · Site&quot;.</>,
          },
        ]}
        links={[
          { label: "Google: title links", href: `${APPEARANCE}/title-link` },
          { label: "Google: snippets and meta descriptions", href: `${APPEARANCE}/snippet` },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            When a link is shared in a chat or a feed, the platform&apos;s bot fetches the page and reads Open Graph (<code>og:*</code>) and X card (
            <code>twitter:*</code>) tags to draw a preview. Those bots read only the server HTML.
          </>
        }
        points={[
          <>
            The core set: <code>og:title</code>, <code>og:description</code>, <code>og:url</code> (the canonical URL), <code>og:image</code> with its
            width, height and alt, <code>og:type</code> and <code>og:site_name</code>. <code>twitter:card</code> set to{" "}
            <code>summary_large_image</code> asks X for the large image layout.
          </>,
          <>Use absolute image URLs (Next.js resolves them against <code>metadataBase</code>) and images of 1200 × 630, which every platform crops well.</>,
          <>
            In Next.js, metadata merges shallowly: a page&apos;s <code>openGraph</code> replaces the layout&apos;s whole object. A <code>siteName</code>{" "}
            set only in the root layout disappears from every page that sets its own <code>openGraph</code>. This site builds every page&apos;s tags in
            one helper for that reason.
          </>,
          <>Platforms cache previews. After fixing a card, ask the platform to fetch it again (most have a debugger or validator for this).</>,
        ]}
        demoTitle="see a page of this site as a shared link"
        demo={<SocialDemo />}
        advice={[
          {
            do: <>Build the title, description, URL and image for every page in one helper, and check a share preview before launch.</>,
            avoid: <>Relative image URLs, one generic image for every page, or Open Graph fields split between a layout and its pages.</>,
          },
        ]}
        links={[
          { label: "The Open Graph protocol", href: "https://ogp.me/" },
          { label: "X: cards markup", href: "https://developer.x.com/en/docs/x-for-websites/cards/overview/markup" },
          { label: "Next.js: metadata merging", href: `${NEXT_DOCS}/api-reference/functions/generate-metadata#merging` },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            A card image per page makes shared links recognisable. Next.js draws them from JSX with <code>ImageResponse</code>, so the image comes from
            the same data as the page and never goes stale.
          </>
        }
        points={[
          <>
            An <code>opengraph-image.tsx</code> file in a route folder adds the image and its tags to that route. This site has a route folder per page,
            so it uses one route, <code>/og/[kind]/[slug]</code>, with <code>generateStaticParams</code>: every image is built once at build time.
          </>,
          <>
            <code>ImageResponse</code> renders with Satori, which supports flexbox and a subset of CSS (no grid) and fonts in ttf, otf or woff. The
            whole bundle, fonts and images included, must stay under 500 KB.
          </>,
          <>Keep the design readable at small sizes: a large title, the section, the site name, and nothing that matters near the edges, which some platforms crop.</>,
          <>Long titles are the usual problem; this layout shrinks the type for titles over 40 characters. Try one below.</>,
        ]}
        demoTitle="look at a real card image and try a long title in its layout"
        demo={<CardDemo />}
        advice={[
          {
            do: <>Generate images from page data at build time, give them alt text, and keep the important part in the centre.</>,
            avoid: <>Rendering images on every request when the content is static, or heavy fonts that break the 500 KB limit.</>,
          },
        ]}
        links={[
          { label: "Next.js: ImageResponse", href: `${NEXT_DOCS}/api-reference/functions/image-response` },
          { label: "Next.js: opengraph-image", href: `${NEXT_DOCS}/api-reference/file-conventions/metadata/opengraph-image` },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            Structured data describes a page in a vocabulary search engines share, schema.org: this is an article by this person, published on this
            date, at this place in the site. Google recommends writing it as JSON-LD in a <code>&lt;script&gt;</code> tag.
          </>
        }
        points={[
          <>
            Every handbook page here sends an <code>Article</code> (headline, description, dates, image, author) and a <code>BreadcrumbList</code> that
            matches the breadcrumbs on screen. The home page sends <code>WebSite</code>.
          </>,
          <>
            Markup must describe what&apos;s visible on the page. A headline, date or rating that the reader can&apos;t see breaks Google&apos;s policies
            and can bring a manual action that removes rich results.
          </>,
          <>
            Structured data makes a page eligible for rich results; it doesn&apos;t guarantee them, and it isn&apos;t a ranking boost.
          </>,
          <>
            In Next.js, render it in the page with <code>JSON.stringify</code> and replace <code>&lt;</code> with <code>{"\\u003c"}</code>, so a value
            containing <code>&lt;/script&gt;</code> can&apos;t end the tag and inject HTML.
          </>,
        ]}
        demoTitle="read and check the JSON-LD a page sends"
        demo={<JsonLdDemo />}
        advice={[
          {
            do: <>Generate JSON-LD from the same data the page renders, and check it in CI and with Google&apos;s Rich Results Test.</>,
            avoid: <>Hand-written markup that drifts from the page, or markup for content that isn&apos;t shown.</>,
          },
        ]}
        links={[
          { label: "Google: Article structured data", href: `${APPEARANCE}/structured-data/article` },
          { label: "Google: Breadcrumb structured data", href: `${APPEARANCE}/structured-data/breadcrumb` },
          { label: "Next.js: JSON-LD", href: `${NEXT_DOCS}/guides/json-ld` },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            Rich results are results with extras: a breadcrumb trail, stars and a price, event dates, a recipe&apos;s cooking time. Each comes from a
            structured data type Google lists in its search gallery, with its own required properties.
          </>
        }
        points={[
          <>
            The gallery includes Article, Breadcrumb, Product, Review snippet, Event, Recipe, Job posting, Local business, Video and others. A type
            that&apos;s valid schema.org but not in the gallery earns no rich result.
          </>,
          <>
            Types come and go. In August 2023 Google limited FAQ rich results to well-known government and health sites and dropped HowTo; neither is
            in the gallery today, yet many sites still send both.
          </>,
          <>
            Review and rating markup is the most abused, and the most policed: self-serving reviews of your own business aren&apos;t eligible.
          </>,
          <>Validate with Google&apos;s Rich Results Test for Google features and the Schema Markup Validator for the vocabulary itself.</>,
        ]}
        demoTitle="write JSON-LD and see what result it could earn"
        demo={<EditorDemo />}
        advice={[
          {
            do: <>Mark up what your page really is with a type from the gallery, fill in its required and recommended properties, and test it.</>,
            avoid: <>Adding FAQ or HowTo markup for rich results, or ratings the page doesn&apos;t show.</>,
          },
        ]}
        links={[
          { label: "Google: search gallery", href: `${APPEARANCE}/structured-data/search-gallery` },
          { label: "Google: structured data policies", href: `${APPEARANCE}/structured-data/sd-policies` },
          { label: "Google: Rich Results Test", href: "https://search.google.com/test/rich-results" },
        ]}
      />
    </div>
  );
}
