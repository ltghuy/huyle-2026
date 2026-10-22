import { articleLd, breadcrumbLd, JsonLd } from "@/lib/json-ld";
import { sectionPath, sections, topicHref, type TopicPage } from "@/practices/catalog";

import { Breadcrumbs } from "./breadcrumbs";
import { PageDates } from "./page-dates";
import { StatusBadge } from "./status-badge";

/** Header for a topic page (breadcrumbs through its section); the page's content follows. */
export function TopicFrame({ page, children }: { page: TopicPage; children: React.ReactNode }) {
  const section = sections.find((s) => s.id === page.section)!;
  const crumbs = [{ label: "Handbook", href: "/" }, { label: section.title, href: sectionPath(page.section) }, { label: page.title }];
  return (
    <article className="flex min-w-0 flex-col gap-8">
      {page.written ? (
        <>
          <JsonLd data={articleLd({ path: topicHref(page.slug), title: page.title, description: page.summary, card: `/og/topic/${page.slug}`, created: page.created, updated: page.updated })} />
          <JsonLd data={breadcrumbLd(crumbs)} />
        </>
      ) : null}
      <header className="flex flex-col gap-2">
        <Breadcrumbs items={crumbs} />
        {page.written ? (
          <PageDates created={page.created} updated={page.updated} />
        ) : (
          <div>
            <StatusBadge built={false} />
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{page.title}</h1>
        <p className="text-muted-foreground">{page.summary}</p>
      </header>
      {children}
    </article>
  );
}
