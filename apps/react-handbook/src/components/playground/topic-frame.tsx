import { sectionPath, sections, type TopicPage } from "@/practices/catalog";

import { Breadcrumbs } from "./breadcrumbs";
import { StatusBadge } from "./status-badge";

/** Header for a topic page (breadcrumbs through its section); the page's content follows. */
export function TopicFrame({ page, children }: { page: TopicPage; children: React.ReactNode }) {
  const section = sections.find((s) => s.id === page.section)!;
  return (
    <article className="flex min-w-0 flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Breadcrumbs items={[{ label: "Handbook", href: "/" }, { label: section.title, href: sectionPath(page.section) }, { label: page.title }]} />
        <div>
          <StatusBadge built={page.written} readyLabel="Written" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{page.title}</h1>
        <p className="max-w-2xl text-muted-foreground">{page.summary}</p>
      </header>
      {children}
    </article>
  );
}
