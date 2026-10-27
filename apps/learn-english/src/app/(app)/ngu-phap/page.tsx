import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/coming-soon";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Ngữ pháp" };

export default function NguPhapPage() {
  return (
    <>
      <PageHeader title="Ngữ pháp" description="Các điểm ngữ pháp và 12 thì trong tiếng Anh." />
      <ComingSoon />
    </>
  );
}
