import type { Metadata } from "next";

/** The production address. Canonical URLs, the sitemap and robots.txt are built from it. */
export const SITE_URL = "https://english.huyle.work";

export const SITE_NAME = "English with Evan";

export const AUTHOR = { name: "Huy Le (Evan)", url: "https://huyle.work" };

/** The site in one sentence: the home page and social-card description. */
export const SITE_DESCRIPTION =
  "Học tiếng Anh miễn phí cho người Việt: từ vựng theo trình độ và chủ đề, ngữ pháp và 12 thì, bài tập và lịch ôn tập giúp bạn nhớ lâu. Không cần tài khoản.";

/**
 * The generated share images (`app/opengraph-image.tsx`, `app/twitter-image.tsx`).
 * A page that sets `openGraph` or `twitter` replaces the root segment's image
 * files too, so every page names them.
 */
export const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE_NAME}: vocabulary, grammar and daily review for Vietnamese learners` };
export const TWITTER_IMAGE = { ...OG_IMAGE, url: "/twitter-image" };

interface PageMeta {
  title?: string;
  description: string;
  /** Route path, for the canonical URL and og:url. */
  path: string;
  /** Pages with only the learner's own data (or focus screens) stay out of search results. */
  index?: boolean;
}

/**
 * Metadata for one page. Nested fields such as `openGraph` replace the
 * layout's instead of merging with it, so every field is set here.
 */
export function pageMetadata({ title, description, path, index = true }: PageMeta): Metadata {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", locale: "vi_VN", siteName: SITE_NAME, url: path, title: fullTitle, description, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [TWITTER_IMAGE] },
    ...(index ? {} : { robots: { index: false, follow: true } }),
  };
}
