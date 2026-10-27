import type { Metadata } from "next";
import { HardWordsView } from "@/components/hard-words/hard-words-view";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Từ khó" };

export default function TuKhoPage() {
  return (
    <>
      <PageHeader title="Từ khó" description="Những từ bạn hay sai hoặc nhớ lâu." />
      <HardWordsView />
    </>
  );
}
