import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { SectionIcon } from "@/components/playground/section-icon";
import { Progress } from "@/components/ui/progress";
import { sectionProgress, sections, SITE_NAME, type Section } from "@/practices/catalog";

const HOW_TO = [
  { title: "Build it", text: "Each practice is a classic frontend problem built from scratch, with a live demo and controls that break it on purpose." },
  { title: "Explain it", text: "Every page has a guide: the key ideas, how it was built, best practices and trade-offs behind each choice." },
  { title: "Stretch it", text: "The other sections cover what sits around the code: the browser, performance, accessibility and system design." },
];

function SectionCard({ section }: { section: Section }) {
  const progress = sectionProgress(section.id);
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
          <SectionIcon id={section.id} className="size-4" />
        </span>
        {section.href ? null : <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">Coming soon</span>}
      </div>
      <h3 className="font-medium">{section.title}</h3>
      <p className="text-sm text-muted-foreground">{section.summary}</p>
      {section.href && progress ? (
        <div className="mt-auto flex flex-col gap-2 pt-2">
          <Progress value={(progress.done / progress.total) * 100} aria-label={`${progress.done} of ${progress.total} ${progress.noun}`} />
          <p className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              <span className="font-mono font-medium text-foreground tabular-nums">
                {progress.done} of {progress.total}
              </span>{" "}
              {progress.noun}
            </span>
            <span className="inline-flex items-center gap-1 font-medium">
              Open <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </span>
          </p>
        </div>
      ) : null}
    </>
  );

  return section.href ? (
    <Link
      href={section.href}
      className="group flex h-full flex-col gap-2 rounded-xl border bg-card p-5 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {body}
    </Link>
  ) : (
    <div className="flex h-full flex-col gap-2 rounded-xl border border-dashed p-5">{body}</div>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">Notes and builds for senior frontend engineers</p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{SITE_NAME}</h1>
        <p className="max-w-2xl text-muted-foreground">
          Hands-on builds and the notes behind them, organised by the topics senior frontend work goes deep on. Start with the React
          Practices, then Performance &amp; Accessibility; the other sections are on the way.
        </p>
      </header>

      <section aria-labelledby="how-heading" className="flex flex-col gap-4">
        <h2 id="how-heading" className="text-lg font-semibold">
          How to use it
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {HOW_TO.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-1 rounded-xl border p-4">
              <span className="font-mono text-xs text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-medium">{step.title}</span>
              <span className="text-sm text-muted-foreground">{step.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="sections-heading" className="flex flex-col gap-4">
        <h2 id="sections-heading" className="text-lg font-semibold">
          Sections
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <li key={section.id}>
              <SectionCard section={section} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
