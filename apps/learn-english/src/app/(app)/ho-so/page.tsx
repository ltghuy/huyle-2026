import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/coming-soon";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Hồ sơ" };

export default function HoSoPage() {
  return (
    <>
      <PageHeader title="Hồ sơ" description="Điểm chuyên cần, chuỗi ngày học và tiến bộ của bạn." />
      <ComingSoon />
    </>
  );
}
