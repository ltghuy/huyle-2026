import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { ReviewOverview } from "@/components/review/review-overview";

export const metadata: Metadata = { title: "Ôn tập" };

export default function ReviewPage() {
  return (
    <>
      <PageHeader title="Ôn tập" description="Ôn lại đúng lúc bạn sắp quên." />
      <ReviewOverview />
    </>
  );
}
