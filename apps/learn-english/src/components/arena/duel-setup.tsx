"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Swords } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccount } from "@/hooks/use-account";
import { useProfile } from "@/hooks/use-profile";
import { DEFAULT_QUESTION_TIME } from "@/learning/arena/protocol";
import type { Level } from "@/learning/types";
import { ArenaError, createRoom } from "@/lib/arena-client";
import { learnerName } from "@/lib/learner-name";
import { ArenaRecord } from "./arena-record";
import { GameGuide } from "./game-guide";
  import { roomPath } from "./join-room";
import { PlayerAvatar } from "./players";
import { SettingsFields, useSettingsDraft } from "./settings-fields";

interface Learner {
  name: string;
  image: string | null;
  level: Level;
}

/** You against an empty seat: the opponent is whoever you send the code to. The guide sits in the corner (AC-009). */
function VersusHeader({ learner }: { learner: Learner }) {
  return (
    <header className="relative isolate grid justify-items-center gap-4 overflow-hidden border-b px-5 pt-8 pb-6 text-center">
      <span aria-hidden className="pointer-events-none absolute top-0 -left-10 -z-10 size-48 rounded-full bg-primary/20 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute top-0 -right-10 -z-10 size-48 rounded-full bg-arena-rival/15 blur-3xl" />
      <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
        <GameGuide />
      </div>
      <div aria-hidden className="flex items-center gap-5 sm:gap-8">
        <figure className="grid w-24 justify-items-center gap-2">
          <PlayerAvatar player={learner} you className="size-16 text-lg" />
          <figcaption className="w-full truncate text-sm font-semibold">{learner.name}</figcaption>
        </figure>
        <span className="bg-linear-to-r from-primary to-arena-rival bg-clip-text text-3xl font-black tracking-tight text-transparent italic">VS</span>
        <figure className="grid w-24 justify-items-center gap-2">
          <span className="grid size-16 place-items-center rounded-full border-2 border-dashed border-arena-rival/60 text-2xl font-bold text-arena-rival">?</span>
          <figcaption className="text-sm text-muted-foreground">Đối thủ</figcaption>
        </figure>
      </div>
      <div className="grid gap-1">
        <h1 id="duel-title" className="text-2xl font-bold tracking-tight">
          Thách đấu 1-1
        </h1>
        <p className="text-sm text-muted-foreground">Chọn cách chơi, tạo phòng rồi gửi mã cho bạn bè.</p>
      </div>
    </header>
  );
}

/** The settings inline and one big "Tạo phòng" (feature 024 AC-004; the rules of 023 AC-002). */
function CreatePanel({ learner }: { learner: Learner }) {
  const router = useRouter();
  const draft = useSettingsDraft({ mode: "mixed", level: learner.level, rounds: 3, seconds: DEFAULT_QUESTION_TIME });
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const canCreate = draft.settings !== null && !creating;

  async function handleCreate() {
    if (!draft.settings || !canCreate) return;
    setCreating(true);
    setError(null);
    try {
      const room = await createRoom(draft.settings, learner.name);
      router.push(roomPath(room.code));
    } catch (cause) {
      setError(cause instanceof ArenaError ? cause.message : "Không tạo được phòng. Bạn thử lại nhé.");
      setCreating(false);
    }
  }

  return (
    <section aria-labelledby="duel-title" className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <VersusHeader learner={learner} />
      <div className="grid gap-5 p-5 sm:p-6">
        <SettingsFields draft={draft} onChange={() => setError(null)} />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button
          size="lg"
          className="h-14 w-full gap-2 text-lg shadow-lg shadow-primary/20 transition-transform active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          disabled={!canCreate}
          onClick={handleCreate}
        >
          <Swords aria-hidden />
          {creating ? "Đang tạo phòng…" : draft.available === null ? "Đang tải câu hỏi…" : "Tạo phòng"}
        </Button>
      </div>
    </section>
  );
}

/** `/arena/1v1` (feature 024): set up a duel on one screen. Joining by code lives on the hub (quick 059). */
export function DuelSetup() {
  const profile = useProfile();
  const { account } = useAccount();
  const ready = profile.status === "ready" ? profile.data : null;
  const learner: Learner | null = ready ? { name: learnerName(ready.displayName, account?.name) ?? "Bạn", image: account?.image ?? null, level: ready.level } : null;

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      {learner ? <CreatePanel learner={learner} /> : <Skeleton className="h-[34rem] w-full rounded-2xl" />}

      <ArenaRecord />
    </div>
  );
}

/** Back to the modes (AC-008). */
export function BackToHub() {
  return (
    <Link href="/arena" className={buttonVariants({ variant: "ghost", className: "h-11 gap-2 px-2" })}>
      <ArrowLeft aria-hidden /> Đấu trường
    </Link>
  );
}
