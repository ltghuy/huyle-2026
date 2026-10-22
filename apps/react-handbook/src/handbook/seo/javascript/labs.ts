// The lab pages at /seo-lab/[lab]: one per JavaScript pattern that changes
// what a crawler sees. Each marker is a sentence the demos look for in the
// server HTML and in the rendered page.

export type Marker = { id: string; label: string; text: string };

export type Lab = { slug: string; title: string; shows: string; markers: Marker[] };

export const ARTICLE = {
  heading: "How to brew pour-over coffee",
  marker: { id: "article", label: "The article text", text: "Rinse the paper filter with hot water before adding the coffee." },
};

export const LABS = [
  {
    slug: "server",
    title: "Rendered on the server",
    shows: "The article is in the HTML the server sends.",
    markers: [ARTICLE.marker],
  },
  {
    slug: "client",
    title: "Rendered only in the browser",
    shows: "The server sends an empty shell; the article appears after JavaScript runs.",
    markers: [ARTICLE.marker],
  },
  {
    slug: "client-title",
    title: "Title set by JavaScript",
    shows: "The server sends a generic title and no description; an effect sets both.",
    markers: [ARTICLE.marker],
  },
  {
    slug: "soft-404",
    title: "Not found, with a 200",
    shows: "A missing product: the app shows \"not found\" but the server answered 200.",
    markers: [{ id: "not-found", label: "The \"not found\" message", text: "Sorry, this product doesn't exist." }],
  },
  {
    slug: "soft-404-noindex",
    title: "Not found, with noindex",
    shows: "The same view, but it adds a noindex meta tag when it shows the error.",
    markers: [{ id: "not-found", label: "The \"not found\" message", text: "Sorry, this product doesn't exist." }],
  },
  {
    slug: "links",
    title: "Links built different ways",
    shows: "The same navigation built as real links, a fragment, a button, a span and an anchor without href.",
    markers: [],
  },
  {
    slug: "interaction",
    title: "Content behind interaction",
    shows: "Text in the HTML, in a closed <details>, added after mount, after a click, and after a scroll event.",
    markers: [
      { id: "html", label: "In the server HTML", text: "This sentence is in the HTML the server sends." },
      { id: "details", label: "Inside a closed <details>", text: "This sentence is inside a closed details element." },
      { id: "mount", label: "Added after mount", text: "This sentence is added by an effect after the page loads." },
      { id: "click", label: "Added on a click", text: "This sentence appears only after the Show more button is clicked." },
      { id: "scroll", label: "Added on a scroll event", text: "This sentence appears only after the page is scrolled." },
    ],
  },
] as const satisfies readonly Lab[];

export type LabSlug = (typeof LABS)[number]["slug"];

export function getLab(slug: string): Lab | undefined {
  return LABS.find((l) => l.slug === slug);
}

export const labPath = (slug: LabSlug) => `/seo-lab/${slug}`;
