import { Fredoka } from "next/font/google";

import { cn } from "@/lib/utils";

// Only the signature uses this face, so it's loaded here rather than in the root layout.
const fredoka = Fredoka({ subsets: ["latin"], weight: "700" });

/** Author sign-off at the end of the home page. */
export function Signature() {
  return (
    <footer
      aria-label="Author"
      className="relative overflow-hidden rounded-2xl border bg-[radial-gradient(ellipse_at_top_left,var(--color-muted),transparent_65%)] px-6 pt-10 pb-8 md:px-10 md:pt-12"
    >
      <p className="text-sm text-muted-foreground md:text-base">Software Engineer · AI-Native Development</p>
      <p className={cn(fredoka.className, "mt-6 text-6xl leading-none tracking-tight text-foreground uppercase md:text-8xl")}>Huy Le</p>
      <div className="mt-10 border-t pt-6">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Le Tran Gia Huy · Designed, built &amp; slightly over-thought</p>
      </div>
    </footer>
  );
}
