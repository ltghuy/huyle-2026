import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PracticeFrame } from "@/components/playground/practice-frame";
import { getPractice, practices } from "@/practices/catalog";

// Built practices have their own route folder, which takes precedence over
// this dynamic segment. Only unbuilt practices are served from here.
export function generateStaticParams() {
  return practices.filter((p) => !p.built).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/practices/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const practice = getPractice(slug);
  return practice
    ? { title: practice.title, description: practice.summary }
    : { title: "Practice not found" };
}

export default async function PracticePage({
  params,
}: PageProps<"/practices/[slug]">) {
  const { slug } = await params;
  const practice = getPractice(slug);
  if (!practice) notFound();
  if (practice.built) {
    throw new Error(
      `Practice "${slug}" is marked built but has no route at app/(playground)/practices/${slug}/page.tsx.`,
    );
  }
  return <PracticeFrame practice={practice} />;
}
