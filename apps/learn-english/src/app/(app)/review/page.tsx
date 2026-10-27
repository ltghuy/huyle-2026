import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { PageHeader } from "@/components/shell/page-header";
import { ReviewOverview } from "@/components/review/review-overview";

export const metadata: Metadata = pageMetadata({ title: "Ôn tập", path: "/review", description: "Ôn lại từ vựng đúng lúc bạn sắp quên.", index: false });

export default function ReviewPage() {
  return (
    <>
      <PageHeader title="Ôn tập" description="Ôn lại đúng lúc bạn sắp quên." />
      <ReviewOverview />
    </>
  );
}
