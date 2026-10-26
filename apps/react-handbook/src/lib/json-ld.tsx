import { AUTHOR, SITE_NAME, SITE_URL } from "./site";
import { isoDate } from "./social";

// Structured data as JSON-LD. JSON.stringify doesn't escape "<", so a value
// containing "</script>" could end the tag early; it's escaped as \u003c.

type Json = Record<string, unknown>;

export function JsonLd({ data }: { data: Json }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export type Crumb = { label: string; href?: string };

/** The visible breadcrumbs as a BreadcrumbList; the last crumb is the page itself. */
export function breadcrumbLd(crumbs: Crumb[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: new URL(c.href, SITE_URL).href.replace(/\/$/, "") } : {}),
    })),
  };
}

export function articleLd({ path, title, description, card, created, updated }: { path: string; title: string; description: string; card: string; created: string; updated: string }): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: `${SITE_URL}${path}`,
    image: [`${SITE_URL}${card}`],
    datePublished: isoDate(created),
    dateModified: isoDate(updated),
    author: { "@type": "Person", name: AUTHOR.name, url: AUTHOR.url },
  };
}

export function websiteLd(description: string): Json {
  return { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE_URL, description };
}
