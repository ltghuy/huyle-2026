import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { NAV_FOLDERS } from "./nav-folders";

// Every ready page in sidebar order, so Previous and Next read the handbook
// straight through, from one section into the next.
const PAGES = NAV_FOLDERS.flatMap((folder) => folder.items.filter((item) => item.ready).map((item) => ({ ...item, section: folder.title })));

function NavCard({ page, direction, crossing }: { page: (typeof PAGES)[number]; direction: "prev" | "next"; crossing: boolean }) {
  const next = direction === "next";
  return (
    <Link
      href={page.href}
      rel={direction}
      className={cn(
        "group flex min-w-0 flex-1 items-center gap-3 rounded-xl border bg-card p-4 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50",
        next && "flex-row-reverse text-right sm:ml-auto",
      )}
    >
      {next ? (
        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      ) : (
        <ChevronLeft aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
      )}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">
          {next ? "Next" : "Previous"}
          {crossing ? ` · ${page.section}` : ""}
        </span>
        <span className="truncate text-sm font-medium">
          {page.prefix ? <span className="mr-1.5 font-mono text-xs text-muted-foreground tabular-nums">{page.prefix}</span> : null}
          {page.title}
        </span>
      </span>
    </Link>
  );
}

/** Links to the previous and next pages; renders nothing for a page that isn't in the list (an unwritten one). */
export function PageNav({ href }: { href: string }) {
  const i = PAGES.findIndex((p) => p.href === href);
  if (i === -1) return null;
  const current = PAGES[i];
  const prev = PAGES[i - 1];
  const next = PAGES[i + 1];
  if (!prev && !next) return null;
  return (
    <nav aria-label="Previous and next pages" className="flex flex-col gap-3 border-t pt-6 sm:flex-row">
      {prev ? <NavCard page={prev} direction="prev" crossing={prev.section !== current.section} /> : null}
      {next ? <NavCard page={next} direction="next" crossing={next.section !== current.section} /> : null}
    </nav>
  );
}
