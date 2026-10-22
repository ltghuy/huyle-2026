import Link from "next/link";

import { Breadcrumbs } from "@/components/playground/breadcrumbs";
import { StatusBadge } from "@/components/playground/status-badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sectionPages, sectionProgress, sections, topicHref, type TopicSectionId } from "@/practices/catalog";

export function sectionMetadata(id: TopicSectionId) {
  const section = sections.find((s) => s.id === id)!;
  return { title: section.title, description: section.summary, alternates: { canonical: section.href! } };
}

/** A topic section's page: title, intro, progress and a card per page. */
export function SectionIndex({ id, intro }: { id: TopicSectionId; intro: React.ReactNode }) {
  const section = sections.find((s) => s.id === id)!;
  const progress = sectionProgress(id)!;
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Breadcrumbs items={[{ label: "Handbook", href: "/" }, { label: section.title }]} />
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{section.title}</h1>
        <p className="text-muted-foreground">{intro}</p>
        <p className="text-sm">
          <span className="font-mono font-medium tabular-nums">
            {progress.done} of {progress.total}
          </span>{" "}
          <span className="text-muted-foreground">{progress.noun}</span>
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sectionPages(id).map((page) => (
          <li key={page.slug} className="flex">
            <Link href={topicHref(page.slug)} className="group flex w-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <Card className="w-full transition-colors group-hover:bg-muted/50">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge built={page.written} readyLabel="Written" />
                    {"level" in page ? <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">{page.level}</span> : null}
                  </div>
                  <CardTitle className="leading-snug">{page.title}</CardTitle>
                  <CardDescription>{page.summary}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
