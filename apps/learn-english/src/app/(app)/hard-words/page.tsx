import { SignInGate } from "@/components/account/sign-in-gate";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { HardWordsView } from "@/components/hard-words/hard-words-view";
import { TriangleAlert } from "lucide-react";
import { Mascot } from "@/components/mascot/mascot";
import { PageHero } from "@/components/shell/page-hero";

const BADGE = { icon: TriangleAlert, text: "Luyện riêng những từ hay sai" };

export const metadata: Metadata = pageMetadata({ title: "Từ khó", path: "/hard-words", description: "Những từ bạn hay sai hoặc nhớ lâu, gom lại để luyện riêng.", index: false });

export default function HardWordsPage() {
  return (
    <>
      <PageHero size="sm" badge={BADGE} title="Từ khó" description="Những từ bạn hay sai hoặc nhớ lâu, gom lại để luyện thêm." mascot={<Mascot mood="think" size="hero" />} />
      <SignInGate area="hard-words">
        <HardWordsView />
      </SignInGate>
    </>
  );
}
