import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/coming-soon";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Cài đặt" };

export default function CaiDatPage() {
  return (
    <>
      <PageHeader title="Cài đặt" description="Trình độ, sao lưu, đồng bộ và hướng dẫn." />
      <ComingSoon />
    </>
  );
}
