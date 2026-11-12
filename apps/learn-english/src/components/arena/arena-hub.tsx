import Link from "next/link";
import { ArrowRight, Swords, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArenaHistoryCard } from "./arena-history-card";
import { CommunityCard } from "./community-card";
import { JoinRoom } from "./join-room";

export const DUEL_PATH = "/arena/1v1";
export const TEAM_PATH = "/arena/team";

const CARD = "relative isolate flex min-h-52 flex-col gap-4 overflow-hidden rounded-2xl border bg-card p-6";

/** The Arena's home (feature 024): pick a kind of match, find a public room in "Cộng đồng" (feature 041), join a friend's room by code (quick 059), look back at past ones (feature 025), and on phones see friends (feature 031). Team matches since feature 039. */
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

      <Link
        href={TEAM_PATH}
        aria-labelledby="arena-team-title"
        aria-describedby="arena-team-text"
        className={cn(
          CARD,
          "group outline-none transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-arena-rival/60 hover:shadow-lg hover:shadow-arena-rival/10 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        )}
      >
        <span aria-hidden className="pointer-events-none absolute -top-16 -right-16 -z-10 size-48 rounded-full bg-arena-rival/15 opacity-70 blur-3xl transition-opacity duration-300 group-hover:opacity-100" />
        <span aria-hidden className="grid size-12 place-items-center rounded-xl bg-arena-rival/15 text-arena-rival">
          <Users className="size-6" />
        </span>
        <span className="grid gap-1.5">
          <span id="arena-team-title" className="text-xl font-bold">
            Đấu đội
          </span>
          <span id="arena-team-text" className="text-sm text-muted-foreground">
            Chia đội cùng bạn bè, thay phiên trả lời trong thời gian giới hạn.
          </span>
        </span>
        <span aria-hidden className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-arena-rival">
          Vào đấu
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" />
        </span>
      </Link>

      <CommunityCard className="sm:col-span-2" />

      <JoinRoom className="sm:col-span-2" />

      <ArenaHistoryCard className="sm:col-span-2" />
    </div>
  );
}
