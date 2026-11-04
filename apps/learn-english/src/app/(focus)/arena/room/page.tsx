import type { Metadata } from "next";
import { Suspense } from "react";
import { RoomScreen } from "@/components/arena/room-screen";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({ title: "Phòng đấu", path: "/arena/room", description: "Một phòng đấu trong Đấu trường của Streak Daily.", index: false });

// The focus layout (no menu): the lobby and the duel take the whole screen. `?code=` is read in the
// browser, so the shell stays prerendered.
export default function ArenaRoomPage() {
  return (
    <Suspense fallback={null}>
      <RoomScreen />
    </Suspense>
  );
}
