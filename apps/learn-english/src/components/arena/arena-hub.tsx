import Link from "next/link";
import { ArrowRight, Swords, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const DUEL_PATH = "/arena/1v1";

const CARD = "relative isolate flex min-h-52 flex-col gap-4 overflow-hidden rounded-2xl border bg-card p-6";

/** The Arena's home (feature 024): pick a kind of match. Team matches come later. */
export function ArenaHub() {
  return (
    <div className="grid gap-4 px-4 pb-10 sm:grid-cols-2 md:px-8">
      <Link
        href={DUEL_PATH}
        aria-labelledby="arena-duel-title"
        aria-describedby="arena-duel-text"
        className={cn(
          CARD,
          "group outline-none transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        )}
      >
        <span aria-hidden className="pointer-events-none absolute -top-16 -right-16 -z-10 size-48 rounded-full bg-primary/20 opacity-70 blur-3xl transition-opacity duration-300 group-hover:opacity-100" />
        <span aria-hidden className="grid size-12 place-items-center rounded-xl bg-primary/15 text-primary">
          <Swords className="size-6" />
        </span>
        <span className="grid gap-1.5">
          <span id="arena-duel-title" className="text-xl font-bold">
            Đấu 1-1
          </span>
          <span id="arena-duel-text" className="text-sm text-muted-foreground">
            Thách đấu một người bạn: cùng một câu hỏi, ai trả lời đúng trước thì ghi điểm.
          </span>
        </span>
        <span aria-hidden className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-primary">
          Vào đấu
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" />
        </span>
      </Link>

      <div aria-disabled="true" aria-labelledby="arena-team-title" aria-describedby="arena-team-text" role="group" className={cn(CARD, "border-dashed bg-card/50")}>
        <span className="flex items-start justify-between gap-3">
          <span aria-hidden className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Users className="size-6" />
          </span>
          <span className="rounded-full border px-2.5 py-1 text-xs font-semibold text-muted-foreground">Sắp ra mắt</span>
        </span>
        <span className="grid gap-1.5">
          <span id="arena-team-title" className="text-xl font-bold text-muted-foreground">
            Đấu đội
          </span>
          <span id="arena-team-text" className="text-sm text-muted-foreground">
            Lập đội cùng bạn bè và thi với đội khác. Chế độ này chưa mở, bạn quay lại sau nhé.
          </span>
        </span>
      </div>
    </div>
  );
}
