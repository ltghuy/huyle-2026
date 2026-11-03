import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  /** The pill above the title. */
  badge: { icon: LucideIcon; text: string };
  title: ReactNode;
  description: string;
  /** `md` for the profile, `sm` for the study pages: left-aligned, with `mascot` before it (feature 020). The home page has its own hero. */
  size?: "sm" | "md";
  /** The companion: before the text of a `sm` hero, above the pill of a `md` hero. */
  mascot?: ReactNode;
  /** Buttons or notes under the description. */
  children?: ReactNode;
}

/**
 * The opening of the profile and study pages (features 019, 020): a soft accent glow, a pill, the title and
 * one line of text. The home page's hero (`HomeHero`) shares the pill and glow but has its own split layout. It leaves room for the greeting pinned to the top-right corner, like `PageHeader`.
 */
export function PageHero({ badge: { icon: Icon, text }, title, description, size = "md", mascot, children }: PageHeroProps) {
  if (size === "sm") {
    return (
      <section aria-labelledby="page-title" className="relative isolate overflow-hidden px-4 pt-[4.25rem] pb-6 md:px-8 md:pt-[4.75rem] md:pb-8">
        <div aria-hidden className="pointer-events-none absolute top-6 -left-16 -z-10 h-28 w-[36rem] max-w-full rounded-full bg-primary/15 blur-3xl" />
        <div className="flex items-center gap-3 md:gap-5">
          {mascot}
          <div className="min-w-0 flex-1">
            <HeroBadge icon={Icon} text={text} />
            <h1
              id="page-title"
              className="mt-3 pb-1 text-3xl font-bold tracking-tight md:text-4xl"
            >
              {title}
            </h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">{description}</p>
            {children}
          </div>
        </div>
      </section>
    );
  }
  return (
    <section aria-labelledby="page-title" className="relative isolate overflow-hidden px-4 pt-[4.25rem] pb-8 text-center md:px-8 md:pt-[4.75rem] md:pb-10">
      {/* A soft glow in the theme's accent colour; decoration only. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-64 max-w-3xl rounded-full bg-primary/15 blur-3xl" />
      {mascot ? <div className="flex justify-center">{mascot}</div> : null}
      <HeroBadge icon={Icon} text={text} className={mascot ? "mx-auto mt-2" : "mx-auto"} />
      <h1 id="page-title" className="mx-auto mt-4 pb-1 text-4xl font-bold tracking-tight md:text-5xl">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground md:text-lg">{description}</p>
      {children}
    </section>
  );
}

/** The pill above a hero title. */
export function HeroBadge({ icon: Icon, text, className }: { icon: LucideIcon; text: string; className?: string }) {
  return (
    <p className={cn("inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground", className)}>
      <Icon className="size-3.5 text-streak" aria-hidden /> {text}
    </p>
  );
}
