import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { practiceHref, topicHref } from "@/practices/catalog";

import { FeedArchitecture } from "./feed-architecture";
import { PRODUCTS } from "./framework";
import { OptimisticDemo } from "./optimistic-demo";
import { PaginationDemo } from "./pagination-demo";

const WEBDEV = "https://web.dev";
const MDN = "https://developer.mozilla.org/en-US/docs";

const FEED = PRODUCTS.find((p) => p.id === "feed")!;

const TOPICS = [
  { id: "requirements", title: "Requirements and architecture" },
  { id: "data", title: "Data model and pagination" },
  { id: "deep-dives", title: "Deep dives: list, media, interactions, freshness" },
] as const;

const inline = "rounded-sm font-medium text-link underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

export function NewsFeedHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          &quot;Design a news feed&quot; is the most-asked frontend system-design prompt. This page runs it through{" "}
          <Link href={topicHref("method")} className={inline}>
            the design method
          </Link>{" "}
          end to end: scope it, architect it, model the data, and go deep on the parts a feed turns on. The hard parts are already
          built as React practices, so the deep dives link to working code; the demos here cover the two feed-specific decisions those don&apos;t:
          why a feed needs cursor pagination, and how an optimistic like rolls back.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={<>Start where the method says to: scope the problem, then sketch the components and pick where rendering happens.</>}
        points={[
          <>
            <strong>Functional:</strong> {FEED.functional.join("; ").toLowerCase()}.
          </>,
          <>
            <strong>Non-functional:</strong> {FEED.nonFunctional.map((nf) => nf.axis.toLowerCase()).join(", ")}: a fast first screen, smooth scroll over thousands of items, works on flaky mobile, and a clear freshness target.
          </>,
          <>
            <strong>Scope cuts</strong> make it tractable: fix the audience (say, mobile-first), defer admin/moderation, and name how personalised and how fresh before designing.
          </>,
          <>
            <strong>Rendering:</strong> server-render the first screen for load and SEO, hydrate, then client-fetch further pages. An alternative is pure client rendering (simpler hosting, slower first paint and weaker SEO). The right call depends on the freshness and SEO requirements above.
          </>,
        ]}
        demoTitle="the feed's architecture"
        demo={<FeedArchitecture />}
        advice={[
          {
            do: <>Scope audience and freshness first; put a data layer between views and the API; justify the rendering choice from the requirements.</>,
            avoid: <>Jumping to components before scope, or picking a rendering mode by habit rather than from the freshness/SEO needs.</>,
          },
        ]}
        links={[
          { label: "web.dev: Rendering on the web", href: `${WEBDEV}/articles/rendering-on-the-web` },
          { label: "The design method", href: topicHref("method") },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            Model the feed as an <strong>ordered list of post ids plus a cursor</strong>, with the posts themselves in a{" "}
            <strong>normalised store keyed by id</strong>. Then a like updates one post object and every place showing it stays consistent,
            and the choice of pagination is no longer cosmetic.
          </>
        }
        points={[
          <>
            Normalise: one post is one entry keyed by id, and the feed is just an ordered id list, so there are no duplicated copies to keep in sync.
          </>,
          <>
            Feeds shift under you: new posts arrive at the top between page loads. <strong>Offset</strong> pagination then re-counts from a moved start and repeats or skips items; <strong>cursor</strong> pagination points at the last post seen and is immune.
          </>,
          <>
            Pick cursor pagination for an endless feed. It is stable and efficient; its cost is that you can&apos;t jump to an arbitrary page, which a feed doesn&apos;t need anyway.
          </>,
          <>Try it: load a page, let new posts arrive, then load the next under each scheme.</>,
        ]}
        demoTitle="cursor vs offset while the feed grows"
        demo={<PaginationDemo />}
        advice={[
          {
            do: <>Use cursor pagination for feeds; normalise posts by id; prefetch the next page near the end of the current one.</>,
            avoid: <>Offset pagination on a live feed, or storing the same post in several shapes.</>,
          },
        ]}
        links={[
          { label: "Advanced Data Grid (pagination in practice)", href: practiceHref("data-grid") },
          { label: "MDN: structured data & keys", href: `${MDN}/Web/JavaScript/Reference/Global_Objects/Map` },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            A feed design comes down to a few deep dives: rendering a huge list cheaply, loading media without the page jumping, and making
            interactions feel instant. Each is a built practice in this handbook: the reasoning is here, and the code is a click away.
          </>
        }
        points={[
          <>
            Render only what&apos;s visible. A feed of thousands of rows must be virtualized, with infinite scroll loading more near the end. See{" "}
            <Link href={practiceHref("virtualized-list")} className={inline}>
              Virtualized Large Lists
            </Link>{" "}
            and{" "}
            <Link href={practiceHref("infinite-scroll")} className={inline}>
              Infinite Scroll
            </Link>
            .
          </>,
          <>
            Load media without layout shift: reserve each image&apos;s space and load lazily so arriving media doesn&apos;t shove content around. See{" "}
            <Link href={practiceHref("lazy-images")} className={inline}>
              Lazy-Loaded Images
            </Link>
            .
          </>,
          <>
            Cache and dedupe fetches. A shared data layer keeps the feed and post details consistent and avoids refetching. See{" "}
            <Link href={practiceHref("data-fetching-hook")} className={inline}>
              Custom Data-Fetching Hook with Caching
            </Link>
            .
          </>,
          <>
            Optimistic UI makes interactions feel instant: update immediately, reconcile with the server, and roll back on failure. The pattern also drives{" "}
            <Link href={practiceHref("realtime-chat")} className={inline}>
              Real-Time Chat
            </Link>
            .
          </>,
          <>
            Treat freshness as a requirement. Seconds-fresh (a &quot;new posts&quot; pill or a realtime push) costs more than minutes-fresh (refetch on focus), so choose it deliberately. Also keep ranking on the server: the client renders the order it&apos;s given and layers in only local signals (a just-sent post, an optimistic like); re-ranking on the client fights the server and breaks pagination. At 10× scale the same design grows with windowed rendering, a media CDN and prefetching, without a rewrite.
          </>,
        ]}
        demoTitle="an optimistic like with rollback"
        demo={<OptimisticDemo />}
        advice={[
          {
            do: <>Virtualize the list, reserve media space, share a caching data layer, make interactions optimistic with a clean rollback, and set an explicit freshness target with ranking on the server.</>,
            avoid: <>Rendering every row, letting images shift the layout, blocking the UI on each like, or re-ranking on the client.</>,
          },
        ]}
        links={[
          { label: "web.dev: Cumulative Layout Shift", href: `${WEBDEV}/articles/cls` },
          { label: "Virtualized Large Lists", href: practiceHref("virtualized-list") },
          { label: "The design method", href: topicHref("method") },
        ]}
      />

      <div className="rounded-xl border bg-muted/40 p-4 text-sm text-foreground/85">
        <p>
          <strong>Next case studies:</strong>{" "}
          <Link href={topicHref("autocomplete")} className={inline}>
            Design an autocomplete
          </Link>
          ,{" "}
          <Link href={topicHref("monorepo")} className={inline}>
            Design a frontend monorepo
          </Link>{" "}
          and{" "}
          <Link href={topicHref("micro-frontends")} className={inline}>
            Design micro frontends
          </Link>
          , each applying the same method to a different shape of problem.
        </p>
      </div>
    </div>
  );
}
