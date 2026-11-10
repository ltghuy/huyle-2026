"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccount } from "@/hooks/use-account";
import { useProfile } from "@/hooks/use-profile";
import { DEFAULT_QUESTION_TIME } from "@/learning/arena/protocol";
import { DEFAULT_ROUND_MINUTES } from "@/learning/arena/team-protocol";
import type { Level } from "@/learning/types";
import { ArenaError, createTeamRoom } from "@/lib/arena-client";
import { learnerName } from "@/lib/learner-name";
import { roomPath } from "./join-room";
import { TeamGameGuide } from "./team-game-guide";
import { TeamSettingsFields, useTeamSettingsDraft } from "./team-settings-fields";

interface Learner {
  name: string;
  level: Level;
}

const DEFAULT_SIZE = 6;

/** The team icon, title and the guide in the corner (AC-048). */
function TeamHeader() {
  return (
    <header className="relative isolate grid justify-items-center gap-4 overflow-hidden border-b px-5 pt-8 pb-6 text-center">
      <span aria-hidden className="pointer-events-none absolute top-0 -left-10 -z-10 size-48 rounded-full bg-primary/20 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute top-0 -right-10 -z-10 size-48 rounded-full bg-arena-rival/15 blur-3xl" />
      <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
        <TeamGameGuide />
      </div>
      <span aria-hidden className="grid size-16 place-items-center rounded-2xl bg-primary/15 text-primary">
        <Users className="size-8" />
      </span>
      <div className="grid gap-1">
        <h1 id="team-title" className="text-2xl font-bold tracking-tight">
          Đấu đội
        </h1>
        <p className="text-sm text-muted-foreground">Chọn cách chơi, tạo phòng rồi gửi mã cho cả nhóm.</p>
      </div>
    </header>
  );
}

/** The settings inline and one big "Tạo phòng" (AC-002). */
function CreatePanel({ learner }: { learner: Learner }) {
  const router = useRouter();
  const draft = useTeamSettingsDraft({ mode: "mixed", level: learner.level, rounds: 1, seconds: DEFAULT_QUESTION_TIME, size: DEFAULT_SIZE, minutes: DEFAULT_ROUND_MINUTES });
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const canCreate = draft.settings !== null && !creating;

  async function handleCreate() {
    if (!draft.settings || !canCreate) return;
    setCreating(true);
    setError(null);
    try {
      const room = await createTeamRoom(draft.settings, learner.name);
      router.push(roomPath(room.code));
    } catch (cause) {
      setError(cause instanceof ArenaError ? cause.message : "Không tạo được phòng. Bạn thử lại nhé.");
      setCreating(false);
    }
  }

  return (
    <section aria-labelledby="team-title" className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <TeamHeader />
      <div className="grid gap-5 p-5 sm:p-6">
        <TeamSettingsFields draft={draft} onChange={() => setError(null)} />
        <Button
          size="lg"
          className="h-14 w-full gap-2 text-lg shadow-lg shadow-primary/20 transition-transform active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          disabled={!canCreate}
          onClick={handleCreate}
        >
          <Users aria-hidden />
          {creating ? "Đang tạo phòng…" : draft.available === null ? "Đang tải câu hỏi…" : "Tạo phòng"}
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** `/arena/team` (feature 039): set up a team room on one screen. */
export function TeamSetup() {
  const profile = useProfile();
  const { account } = useAccount();
  const ready = profile.status === "ready" ? profile.data : null;
  const learner: Learner | null = ready ? { name: learnerName(ready.displayName, account?.name) ?? "Bạn", level: ready.level } : null;

  return <div className="mx-auto grid w-full max-w-2xl gap-6">{learner ? <CreatePanel learner={learner} /> : <Skeleton className="h-[40rem] w-full rounded-2xl" />}</div>;
}
