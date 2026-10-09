import { ExternalLink } from "lucide-react";

import { DemoStage } from "@/components/playground/demo-stage";
import { DoAvoid } from "@/components/playground/practice-guide";

export type TopicLink = { label: string; href: string };

/** One topic of the handbook: short notes, a live demo, advice, and the web.dev modules to read next. */
export function Topic({
  id,
  number,
  title,
  intro,
  points,
  demoTitle,
  demo,
  advice,
  links,
  linksLabel = "Read more on web.dev:",
}: {
  id: string;
  number: number;
  title: string;
  intro: React.ReactNode;
  points: React.ReactNode[];
  demoTitle: string;
  demo: React.ReactNode;
  advice: { do: React.ReactNode; avoid: React.ReactNode }[];
  links: TopicLink[];
  linksLabel?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="flex scroll-mt-16 flex-col gap-4 border-t pt-8">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{String(number).padStart(2, "0")}</span>
        <h2 id={`${id}-heading`} className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
      </header>
      <div className="flex max-w-3xl flex-col gap-3 text-sm leading-relaxed text-foreground/85 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-foreground">
        <p>{intro}</p>
        <ul className="flex flex-col gap-1.5 pl-4">
          {points.map((point, i) => (
            <li key={i} className="list-disc">
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Try it: {demoTitle}</h3>
        <DemoStage label={`Live demo: ${title}`}>{demo}</DemoStage>
      </div>
      <div className="text-sm text-foreground/85 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-foreground">
        <DoAvoid items={advice} />
      </div>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">{linksLabel}</span>
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {link.label}
            <ExternalLink aria-hidden className="size-3.5" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ))}
      </p>
    </section>
  );
}
