import { BookOpen } from "lucide-react";

import type { Practice } from "@/practices/catalog";

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
  return (
    <article className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-muted-foreground tabular-nums">
            {String(practice.number).padStart(2, "0")}
          </span>
          <StatusBadge built={practice.built} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {practice.title}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{practice.summary}</p>
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
