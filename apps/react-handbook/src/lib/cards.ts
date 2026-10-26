import { practices, sections, topicPages, type PageLevel } from "@/practices/catalog";

import { SITE_NAME } from "./site";

// Every social card the site has: one per indexable page. The /og route
// builds an image for each at build time.

export type CardKind = "site" | "section" | "practice" | "topic";

export type Card = { kind: CardKind; slug: string; eyebrow: string; title: string; level?: PageLevel };

const sectionTitle = (id: string) => sections.find((s) => s.id === id)!.title;

export const CARDS: readonly Card[] = [
  { kind: "site", slug: "home", eyebrow: "Notes and builds for senior frontend engineers", title: SITE_NAME },
  ...sections.filter((s) => s.href !== null).map((s): Card => ({ kind: "section", slug: s.id, eyebrow: "Section", title: s.title })),
  ...practices.map((p): Card => ({ kind: "practice", slug: p.slug, eyebrow: `React Practices · ${String(p.number).padStart(2, "0")}`, title: p.title })),
  ...topicPages.map((p): Card => ({ kind: "topic", slug: p.slug, eyebrow: sectionTitle(p.section), title: p.title, level: "level" in p ? p.level : undefined })),
];

export function findCard(kind: string, slug: string): Card | undefined {
  return CARDS.find((c) => c.kind === kind && c.slug === slug);
}

export const cardPath = (card: Pick<Card, "kind" | "slug">) => `/og/${card.kind}/${card.slug}`;
