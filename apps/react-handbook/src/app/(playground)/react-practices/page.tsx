import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/playground/breadcrumbs";
import { StatusBadge } from "@/components/playground/status-badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { breadcrumbLd, JsonLd } from "@/lib/json-ld";
import { pageMetadata } from "@/lib/social";
import { builtCount, practiceHref, practices, sections } from "@/practices/catalog";

const section = sections.find((s) => s.id === "react-practices")!;

export const metadata: Metadata = pageMetadata({ path: section.href!, title: section.title, description: section.summary, card: "/og/section/react-practices" });

export default function ReactPracticesPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <JsonLd data={breadcrumbLd([{ label: "Handbook", href: "/" }, { label: section.title }])} />
        <Breadcrumbs items={[{ label: "Handbook", href: "/" }, { label: section.title }]} />
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{section.title}</h1>
        <p className="text-muted-foreground">
          Fourteen classic frontend problems, each built from scratch with no third-party libraries. Pick one to see the live demo and the
          notes behind it.
        </p>
        <p className="text-sm">
          <span className="font-mono font-medium tabular-nums">
            {builtCount} of {practices.length}
          </span>{" "}
          <span className="text-muted-foreground">practices built</span>
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {practices.map((p) => (
          <li key={p.slug} className="flex">
            <Link
              href={practiceHref(p.slug)}
              className="group flex w-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Card className="w-full transition-colors group-hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">{String(p.number).padStart(2, "0")}</span>
                    <StatusBadge built={p.built} />
                  </div>
                  <CardTitle className="leading-snug">{p.title}</CardTitle>
                  <CardDescription>{p.summary}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
