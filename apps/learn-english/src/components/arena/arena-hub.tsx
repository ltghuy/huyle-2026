"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useAccount } from "@/hooks/use-account";
import { useProfile } from "@/hooks/use-profile";
import { learnerName } from "@/lib/learner-name";
import { ArenaRecord } from "./arena-record";
import { CreateRoom } from "./create-room";
import { JoinRoom } from "./join-room";

/** The Arena's home (feature 023, AC-001): create a room or join one by code, and the learner's record. */
export function ArenaHub() {
  const profile = useProfile();
  const { account } = useAccount();
  const ready = profile.status === "ready" ? profile.data : null;
  const name = learnerName(ready?.displayName, account?.name);

  return (
    <div className="grid gap-4 px-4 pb-10 md:px-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="arena-create" className="grid content-start gap-3 rounded-xl border bg-card p-5">
          <h2 id="arena-create" className="text-lg font-semibold">
            Thách đấu một người bạn
          </h2>
          <p className="text-sm text-muted-foreground">Tạo phòng, gửi mã cho bạn bè. Cùng một câu hỏi, ai trả lời đúng trước thì ghi điểm.</p>
          {ready ? <CreateRoom defaultLevel={ready.level} name={name} /> : <Skeleton className="h-12 w-40" />}
        </section>
        <section aria-label="Vào phòng" className="rounded-xl border bg-card p-5">
          <JoinRoom name={name} />
        </section>
      </div>
      <ArenaRecord />
    </div>
  );
}
