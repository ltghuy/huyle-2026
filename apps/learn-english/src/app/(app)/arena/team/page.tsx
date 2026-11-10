import type { Metadata } from "next";
import { SignInGate } from "@/components/account/sign-in-gate";
import { BackToHub } from "@/components/arena/duel-setup";
import { TeamSetup } from "@/components/arena/team-setup";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Đấu đội",
  path: "/arena/team",
  description: "Tạo phòng đấu đội cho 2 đến 10 người, chọn chế độ, trình độ và thời lượng mỗi hiệp, rồi gửi mã cho bạn bè.",
});

/** Feature 039: set up a team room on one screen (AC-002, AC-006). */
export default function ArenaTeamPage() {
  return (
    <div className="px-4 pt-[4.25rem] pb-10 md:px-8 md:pt-[4.75rem]">
      <div className="mx-auto grid w-full max-w-2xl gap-4">
        <div>
          <BackToHub />
        </div>
        <SignInGate area="arena">
          <TeamSetup />
        </SignInGate>
      </div>
    </div>
  );
}
