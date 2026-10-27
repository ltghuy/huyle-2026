import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { HardWordsView } from "@/components/hard-words/hard-words-view";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = pageMetadata({ title: "Từ khó", path: "/hard-words", description: "Những từ bạn hay sai hoặc nhớ lâu, gom lại để luyện riêng.", index: false });

export default function TuKhoPage() {
  return (
    <>
      <PageHeader title="Từ khó" description="Những từ bạn hay sai hoặc nhớ lâu." />
      <HardWordsView />
    </>
  );
}
