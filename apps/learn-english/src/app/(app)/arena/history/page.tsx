import type { Metadata } from "next";
import { SignInGate } from "@/components/account/sign-in-gate";
import { BackToHub } from "@/components/arena/duel-setup";
import { MatchHistory } from "@/components/arena/match-history";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Lịch sử đấu",
  path: "/arena/history",
  description: "Xem lại các trận Đấu trường của bạn: kết quả, tỉ số, đối thủ và thời gian.",
});

/** Feature 025: the learner's newest Arena matches. */
export default function ArenaHistoryPage() {
  return (
    <div className="px-4 pt-[4.25rem] pb-10 md:px-8 md:pt-[4.75rem]">
      <div className="mx-auto grid w-full max-w-2xl gap-4">
        <div>
          <BackToHub />
        </div>
        <div className="grid gap-1">
          <h1 className="text-2xl font-bold">Lịch sử đấu</h1>
          <p className="text-muted-foreground">50 trận gần nhất của bạn, mới nhất ở trên. Chạm vào một trận để xem điểm từng hiệp.</p>
        </div>
        <SignInGate area="arena">
          <MatchHistory />
        </SignInGate>
      </div>
    </div>
  );
}
