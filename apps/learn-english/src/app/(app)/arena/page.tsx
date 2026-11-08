import type { Metadata } from "next";
import { Swords } from "lucide-react";
import { ArenaHub } from "@/components/arena/arena-hub";
import { Mascot } from "@/components/mascot/mascot";
import { PageHero } from "@/components/shell/page-hero";
import { pageMetadata } from "@/lib/site";

const BADGE = { icon: Swords, text: "Thi đấu với bạn bè" };

export const metadata: Metadata = pageMetadata({
  title: "Đấu trường",
  path: "/arena",
  description: "Thách đấu bạn bè bằng mã phòng: nghe và chọn từ, nhớ từ, viết câu. Ai trả lời đúng trước thì ghi điểm.",
});

// The modes are links for everyone; signing in is asked on the mode's own screen (feature 024).
export default function ArenaPage() {
  return (
    <>
      <PageHero size="sm" badge={BADGE} title="Đấu trường" description="Chọn cách đấu: cùng một câu hỏi, ai trả lời đúng trước thì ghi điểm." mascot={<Mascot mood="cheer" size="hero" />} />
      <ArenaHub />
    </>
  );
}
