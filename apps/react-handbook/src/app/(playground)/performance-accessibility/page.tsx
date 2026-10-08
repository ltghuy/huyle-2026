import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/playground/breadcrumbs";
import { StatusBadge } from "@/components/playground/status-badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { perfA11yPages, sectionProgress, sections, topicHref } from "@/practices/catalog";

const section = sections.find((s) => s.id === "performance-accessibility")!;
const progress = sectionProgress("performance-accessibility")!;

export const metadata: Metadata = { title: section.title, description: section.summary };

export default function PerformanceAccessibilityPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Breadcrumbs items={[{ label: "Handbook", href: "/" }, { label: section.title }]} />
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{section.title}</h1>
        <p className="max-w-2xl text-muted-foreground">
          Short handbooks on making pages fast and usable by everyone: the main concepts, what matters most, and live demos you can
          measure in your own browser.
        </p>
        <p className="text-sm">
          <span className="font-mono font-medium tabular-nums">
            {progress.done} of {progress.total}
          </span>{" "}
          <span className="text-muted-foreground">{progress.noun}</span>
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {perfA11yPages.map((page) => (
          <li key={page.slug} className="flex">
            <Link href={topicHref(page.slug)} className="group flex w-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <Card className="w-full transition-colors group-hover:bg-muted/50">
                <CardHeader>
                  <div>
                    <StatusBadge built={page.written} readyLabel="Written" />
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
