import Link from "next/link";

import { getTopicPage, topicHref, type TopicSlug } from "@/practices/catalog";

type Area = {
  title: string;
  owner: "Frontend" | "Shared" | "Marketing";
  levels: [basics: string, intermediate: string, senior: string];
  pages: TopicSlug[];
};

const AREAS: readonly Area[] = [
  {
    title: "Technical",
    owner: "Frontend",
    levels: [
      "Status codes, robots.txt, the sitemap, canonical URLs, crawlable links.",
      "Rendering strategies, JavaScript SEO, Core Web Vitals.",
      "Crawl budget, migrations and redirect maps, faceted navigation, hreflang, log analysis.",
    ],
    pages: ["how-search-works", "crawling-indexing", "javascript-seo", "seo-at-scale"],
  },
  {
    title: "Content and on-page",
    owner: "Shared",
    levels: [
      "Titles, descriptions, headings, internal links.",
      "Writing for search intent, page templates that scale.",
      "Topic clusters, programmatic pages without thin content.",
    ],
    pages: ["metadata-structured-data", "seo-at-scale"],
  },
  {
    title: "Search appearance",
    owner: "Frontend",
    levels: ["Social cards and images.", "JSON-LD and rich results.", "Testing structured data across thousands of templated pages."],
    pages: ["metadata-structured-data"],
  },
  {
    title: "AI search",
    owner: "Shared",
    levels: ["Which AI crawlers exist and how robots.txt applies to them.", "llms.txt, content AI assistants can quote.", "Measuring AI referrals and citations."],
    pages: ["ai-search"],
  },
  {
    title: "Measurement",
    owner: "Shared",
    levels: ["Search Console's indexing and performance reports.", "URL inspection, reading trends against releases.", "SEO checks in CI, monitoring, server logs."],
    pages: ["how-search-works", "seo-at-scale"],
  },
  {
    title: "Authority and links",
    owner: "Marketing",
    levels: ["Why links matter.", "Earning links with content worth citing.", "Digital PR, brand mentions."],
    pages: [],
  },
];

const LEVELS = ["Basics", "Intermediate", "Senior and expert"] as const;

const inline = "rounded-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/** What SEO work covers, by area and level, and who usually owns it. */
export function SkillMap() {
  return (
    <section aria-labelledby="skill-map-heading" className="flex flex-col gap-3">
      <h2 id="skill-map-heading" className="text-sm font-medium">
        What SEO work covers
      </h2>
      <ul className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {AREAS.map((area) => (
          <li key={area.title} className="flex min-w-0 flex-col gap-2 rounded-xl border p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">{area.title}</h3>
              <span className="rounded-md border px-2 py-0.5 text-xs text-foreground/80">{area.owner === "Shared" ? "Frontend and content" : area.owner}</span>
            </div>
            <dl className="flex flex-col gap-1.5">
              {area.levels.map((text, i) => (
                <div key={LEVELS[i]}>
                  <dt className="text-xs font-medium text-foreground/75">{LEVELS[i]}</dt>
                  <dd className="text-foreground/85">{text}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-auto pt-1 text-xs text-foreground/80">
              {area.pages.length === 0 ? (
                "Marketing work, outside this section."
              ) : (
                <>
                  Covered in{" "}
                  {area.pages.map((slug, i) => (
                    <span key={slug}>
                      {i > 0 ? ", " : null}
                      <Link href={topicHref(slug)} className={inline}>
                        {getTopicPage(slug).title}
                      </Link>
                    </span>
                  ))}
                  .
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
