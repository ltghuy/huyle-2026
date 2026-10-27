import topics from "../../content/topics.json";
import grammarTopics from "../../content/grammar-topics.json";
import type { Level } from "@/learning/types";

// Topic and grammar-topic names come from the reviewed lists in `content/`,
// so pages can show Vietnamese titles and the full grammar syllabus before
// every item is published.

/** Query value for words and sentences that have no topic. */
export const OTHER_TOPIC = "khac";

export interface GrammarTopicMeta {
  slug: string;
  level: Level;
  titleEn: string;
  titleVi: string;
  order: number;
}

const TOPIC_TITLES = new Map(topics.map((topic) => [topic.slug, topic.titleVi]));
const TOPIC_ORDER = new Map(topics.map((topic, i) => [topic.slug, i]));

export const GRAMMAR_TOPICS: readonly GrammarTopicMeta[] = grammarTopics as GrammarTopicMeta[];
const GRAMMAR_BY_SLUG = new Map(GRAMMAR_TOPICS.map((topic) => [topic.slug, topic]));

/** The item's topic slug, or `OTHER_TOPIC` when it has none. */
export function topicOf(item: { topic?: string }): string {
  return item.topic || OTHER_TOPIC;
}

export function topicTitle(slug: string): string {
  if (slug === OTHER_TOPIC) return "Chủ đề khác";
  return TOPIC_TITLES.get(slug) ?? slug;
}

/** Sorts topic slugs in the order of `content/topics.json`; unknown ones and "other" go last. */
export function compareTopics(a: string, b: string): number {
  const rank = (slug: string) => (slug === OTHER_TOPIC ? Number.MAX_SAFE_INTEGER : (TOPIC_ORDER.get(slug) ?? Number.MAX_SAFE_INTEGER - 1));
  return rank(a) - rank(b) || a.localeCompare(b);
}

export function grammarTopicMeta(slug: string): GrammarTopicMeta | undefined {
  return GRAMMAR_BY_SLUG.get(slug);
}

/** `grammar:<slug>` → `<slug>`. */
export function grammarSlug(id: string): string {
  return id.slice("grammar:".length);
}
