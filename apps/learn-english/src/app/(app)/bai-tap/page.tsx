import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/coming-soon";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Bài tập" };

export default function BaiTapPage() {
  return (
    <>
      <PageHeader title="Bài tập" description="Tự luyện mọi phần của khóa học." />
      <ComingSoon />
    </>
  );
}
