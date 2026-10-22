import { BookOpen } from "lucide-react";

import { articleLd, breadcrumbLd, JsonLd } from "@/lib/json-ld";
import { practiceHref, PRACTICES_PATH, type Practice } from "@/practices/catalog";

import { Breadcrumbs } from "./breadcrumbs";
import { PageDates } from "./page-dates";
import { PracticePlaceholder } from "./practice-placeholder";
import { StatusBadge } from "./status-badge";

export function PracticeFrame({
  practice,
  explanation,
  demo,
}: {
  practice: Practice;
  /** Server-rendered notes; omitted for unbuilt practices. */
  explanation?: React.ReactNode;
  /** Client demo: optional DemoControls, then a DemoStage. */
  demo?: React.ReactNode;
}) {
  const crumbs = [{ label: "Handbook", href: "/" }, { label: "React Practices", href: PRACTICES_PATH }, { label: practice.title }];
  return (
    <article className="flex min-w-0 flex-col gap-6">
      {practice.built ? (
        <>
          <JsonLd
            data={articleLd({ path: practiceHref(practice.slug), title: practice.title, description: practice.summary, card: `/og/practice/${practice.slug}`, created: practice.created, updated: practice.updated })}
          />
          <JsonLd data={breadcrumbLd(crumbs)} />
        </>
      ) : null}
      <header className="flex flex-col gap-2">
        <Breadcrumbs items={crumbs} />
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {String(practice.number).padStart(2, "0")}
          </span>
          {practice.built ? <PageDates created={practice.created} updated={practice.updated} /> : <StatusBadge built={false} />}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {practice.title}
        </h1>
        <p className="text-muted-foreground">{practice.summary}</p>
      </header>

      {demo ? (
        <>
          <section
            aria-labelledby="explanation-heading"
            className="rounded-xl border bg-card p-4 md:p-6"
          >
            <h2
              id="explanation-heading"
              className="mb-3 flex items-center gap-2 text-sm font-medium"
            >
              <BookOpen aria-hidden className="size-4 text-muted-foreground" />
              How it works
            </h2>
            <div className="max-w-none text-sm leading-relaxed text-muted-foreground [&_code]:font-mono [&_code]:text-foreground [&_li]:ml-4 [&_li]:list-disc [&_p+p]:mt-2 [&_ul]:mt-2">
              {explanation}
            </div>
          </section>
          <div key={practice.slug} className="flex min-w-0 flex-col gap-4">
            {demo}
          </div>
        </>
      ) : (
        <PracticePlaceholder
          featureId={String(practice.number + 1).padStart(3, "0")}
        />
      )}
    </article>
  );
}
