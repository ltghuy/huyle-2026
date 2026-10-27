import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/coming-soon";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Từ vựng" };

export default function TuVungPage() {
  return (
    <>
      <PageHeader title="Từ vựng" description="Từ vựng theo trình độ và chủ đề." />
      <ComingSoon />
    </>
  );
}
