import type { Metadata } from "next";
import { Swords } from "lucide-react";
import { SignInGate } from "@/components/account/sign-in-gate";
import { ArenaHub } from "@/components/arena/arena-hub";
import { Owl } from "@/components/mascot/owl";
import { PageHero } from "@/components/shell/page-hero";
import { pageMetadata } from "@/lib/site";

const BADGE = { icon: Swords, text: "Đấu 1-1 với bạn bè" };

export const metadata: Metadata = pageMetadata({
  title: "Đấu trường",
  path: "/arena",
  description: "Thách đấu bạn bè bằng mã phòng: nghe và chọn từ, nhớ từ, viết câu. Ai trả lời đúng trước thì ghi điểm.",
});

export default function ArenaPage() {
  return (
    <>
      <PageHero size="sm" badge={BADGE} title="Đấu trường" description="Thách đấu bạn bè: cùng một câu hỏi, ai trả lời đúng trước thì ghi điểm." mascot={<Owl mood="cheer" size="hero" />} />
      <SignInGate area="arena">
        <ArenaHub />
      </SignInGate>
    </>
  );
}
