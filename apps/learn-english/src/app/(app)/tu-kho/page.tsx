import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/coming-soon";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Từ khó" };

export default function TuKhoPage() {
  return (
    <>
      <PageHeader title="Từ khó" description="Những từ bạn hay sai hoặc nhớ lâu." />
      <ComingSoon />
    </>
  );
}
