import { Check, ChevronDown, X } from "lucide-react";

// Building blocks for each practice's guide ("How it works" panel). All
// server-rendered: "Read more" is a native <details>, so it needs no JS and
// the browser's find-in-page can still reach the collapsed text.

/** Always visible: what the pattern is and the problem it solves. */
export function Intro({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2 text-foreground/85">{children}</div>;
}

export type KeyIdea = { title: string; text: React.ReactNode };

/** Always visible: three or four one-line techniques. */
export function KeyIdeas({ items }: { items: KeyIdea[] }) {
  return (
    <ul className="mt-3 flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.title}>
          <strong className="font-medium text-foreground">{item.title}:</strong> {item.text}
        </li>
      ))}
    </ul>
  );
}

/** The full guide, collapsed by default. */
export function ReadMore({ children }: { children: React.ReactNode }) {
  return (
    <details className="group mt-4">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md py-1 text-sm font-medium text-foreground outline-none select-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">Read more</span>
        <span className="hidden group-open:inline">Show less</span>
        <ChevronDown aria-hidden className="size-4 motion-safe:transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 flex flex-col gap-5 border-t pt-4">{children}</div>
    </details>
  );
}

export function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

/** Paired advice: what to do, and the mistake it avoids. */
export function DoAvoid({ items }: { items: { do: React.ReactNode; avoid: React.ReactNode }[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="ml-0! list-none! rounded-lg border p-3">
          <p className="flex gap-2">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
            <span>
              <span className="sr-only">Do: </span>
              {item.do}
            </span>
          </p>
          <p className="mt-1 flex gap-2">
            <X aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
            <span>
              <span className="sr-only">Avoid: </span>
              {item.avoid}
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}

/** One row per demo control: what it does and what to watch for. */
export function ControlGuide({ items }: { items: { control: string; watch: React.ReactNode }[] }) {
  return (
    <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(9rem,auto)_1fr]">
      {items.map((item) => (
        <div key={item.control} className="contents">
          <dt className="font-medium text-foreground">{item.control}</dt>
          <dd className="mb-1 sm:mb-0">{item.watch}</dd>
        </div>
      ))}
    </dl>
  );
}
