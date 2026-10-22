import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TopicFrame } from "@/components/playground/topic-frame";
import { findTopicPage, sectionPages, SEO_PATH } from "@/practices/catalog";

// Written pages have their own route folder, which takes precedence over this
// dynamic segment. Only the section's unwritten pages are served from here.
export function generateStaticParams() {
  return sectionPages("seo")
    .filter((p) => !p.written)
    .map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/seo/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = findTopicPage("seo", slug);
  return page ? { title: page.title, description: page.summary } : { title: "Page not found" };
}

export default async function UnwrittenSeoPage({ params }: PageProps<"/seo/[slug]">) {
  const { slug } = await params;
  const page = findTopicPage("seo", slug);
  if (!page) notFound();
  if (page.written) {
    throw new Error(`Page "${slug}" is marked written but has no route at app/(playground)/seo/${slug}/page.tsx.`);
  }
  return (
    <TopicFrame page={page}>
      <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
        This page is being written. Until then, start with{" "}
        <Link href={SEO_PATH} className="rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          the section overview
        </Link>
        .
      </p>
    </TopicFrame>
  );
}
