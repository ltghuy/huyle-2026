import Link from "next/link";
import { ArrowRight, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export const COMMUNITY_PATH = "/arena/community";

/** The hub's way into "Cộng đồng" (feature 041, AC-006), under the two kinds of match. One link for everyone; the page asks guests to sign in. */
export function CommunityCard({ className }: { className?: string }) {
  return (
    <Link
      href={COMMUNITY_PATH}
      aria-labelledby="arena-community-title"
      aria-describedby="arena-community-text"
      className={cn(
        "group relative isolate flex items-center gap-4 overflow-hidden rounded-2xl border bg-card p-5 outline-none transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-success/60 hover:shadow-lg hover:shadow-success/10 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 sm:p-6",
        className,
      )}
    >
      <span aria-hidden className="pointer-events-none absolute -top-16 -right-16 -z-10 size-48 rounded-full bg-success/15 opacity-60 blur-3xl transition-opacity duration-300 group-hover:opacity-100" />
      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
        <Globe className="size-6" />
      </span>
      <span className="grid min-w-0 flex-1 gap-1">
        <span id="arena-community-title" className="text-lg font-bold">
          Cộng đồng
        </span>
        <span id="arena-community-text" className="text-sm text-muted-foreground">
          Xem các phòng đang chờ người chơi, 1-1 hay đấu đội, và vào ngay không cần mã.
        </span>
      </span>
      <ArrowRight aria-hidden className="size-5 shrink-0 text-success transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" />
    </Link>
  );
}
