import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientArticle, ClientTitle, InteractionParts, JsLinks, SoftNotFound } from "@/handbook/seo/javascript/lab-client";
import { ARTICLE, getLab, LABS } from "@/handbook/seo/javascript/labs";
import { topicHref } from "@/practices/catalog";

// Lab pages for "JavaScript and rendering SEO". They stay out of search
// through an X-Robots-Tag header (next.config), so each page's own robots
// meta tag is free to show the case it demonstrates.

export function generateStaticParams() {
  return LABS.map((l) => ({ lab: l.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/seo-lab/[lab]">): Promise<Metadata> {
  const { lab } = await params;
  const page = getLab(lab);
  if (!page) return { title: "Page not found" };
  // The client-title case sends a generic title and no description on purpose.
  if (page.slug === "client-title") return { title: { absolute: "SEO lab" }, description: null };
  return { title: { absolute: `${page.title} · SEO lab` }, description: page.shows, alternates: { canonical: `/seo-lab/${page.slug}` } };
}

function Case({ slug }: { slug: string }) {
  const lab = getLab(slug)!;
  switch (slug) {
    case "server":
      return (
        <article>
          <h1>{ARTICLE.heading}</h1>
          <p data-marker={ARTICLE.marker.id}>{ARTICLE.marker.text}</p>
        </article>
      );
    case "client":
      return <ClientArticle />;
    case "client-title":
      return (
        <>
          <ClientTitle />
          <article>
            <h1>{ARTICLE.heading}</h1>
            <p data-marker={ARTICLE.marker.id}>{ARTICLE.marker.text}</p>
          </article>
        </>
      );
    case "soft-404":
    case "soft-404-noindex":
      return <SoftNotFound noindex={slug === "soft-404-noindex"} />;
    case "links":
      return (
        <nav aria-label="Lab links" className="flex flex-col items-start gap-2">
          <h1>Links built different ways</h1>
          <Link href="/seo-lab/server" data-nav="Next.js <Link> (an <a href>)">
            Brewing guide (Link)
          </Link>
          <Link href="/seo-lab/client-title" rel="nofollow" data-nav='<Link rel="nofollow">'>
            Brewing guide (nofollow)
          </Link>
          <a href="#/brewing-guide" data-nav="Fragment route">
            Brewing guide (#/ route)
          </a>
          <JsLinks />
        </nav>
      );
    case "interaction": {
      const [html, details] = lab.markers;
      return (
        <article>
          <h1>Content behind interaction</h1>
          <p data-marker={html.id}>{html.text}</p>
          <details>
            <summary>More details</summary>
            <p data-marker={details.id}>{details.text}</p>
          </details>
          <InteractionParts />
        </article>
      );
    }
    default:
      notFound();
  }
}

export default async function LabPage({ params }: PageProps<"/seo-lab/[lab]">) {
  const { lab } = await params;
  const page = getLab(lab);
  if (!page) notFound();
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6 text-sm [&_a]:underline [&_button]:rounded [&_button]:border [&_button]:px-2 [&_button]:py-1 [&_h1]:text-xl [&_h1]:font-semibold">
      <p className="text-xs text-muted-foreground">
        SEO lab: {page.shows} Used by{" "}
        <Link href={topicHref("javascript-seo")}>JavaScript and rendering SEO</Link>.
      </p>
      <Case slug={page.slug} />
    </main>
  );
}
