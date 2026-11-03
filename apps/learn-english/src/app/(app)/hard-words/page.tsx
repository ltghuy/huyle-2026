import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { HardWordsView } from "@/components/hard-words/hard-words-view";
import { TriangleAlert } from "lucide-react";
import { Owl } from "@/components/mascot/owl";
import { PageHero } from "@/components/shell/page-hero";

const BADGE = { icon: TriangleAlert, text: "Luyện riêng những từ hay sai" };

export const metadata: Metadata = pageMetadata({ title: "Từ khó", path: "/hard-words", description: "Những từ bạn hay sai hoặc nhớ lâu, gom lại để luyện riêng.", index: false });

export default function HardWordsPage() {
  return (
    <>
      <PageHero size="sm" badge={BADGE} title="Từ khó" description="Những từ bạn hay sai hoặc nhớ lâu, gom lại để luyện thêm." mascot={<Owl mood="think" size="hero" />} />
      <HardWordsView />
    </>
  );
}
