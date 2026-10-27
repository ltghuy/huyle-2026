import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/coming-soon";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Ôn tập" };

export default function OnTapPage() {
  return (
    <>
      <PageHeader title="Ôn tập" description="Ôn lại đúng lúc bạn sắp quên." />
      <ComingSoon />
    </>
  );
}
