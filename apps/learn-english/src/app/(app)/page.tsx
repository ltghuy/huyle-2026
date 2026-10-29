import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { TodayLesson } from "@/components/lesson/today-lesson";
import { homeLd, JsonLd } from "@/lib/json-ld";
import { pageMetadata, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = pageMetadata({ description: SITE_DESCRIPTION, path: "/" });

export default function HomePage() {
  return (
    <>
      <JsonLd data={homeLd()} />
      <PageHeader title="Bài học hôm nay" description="Ôn lại bài cũ, học từ mới và luyện câu, mỗi ngày một chút." />
      <TodayLesson />
    </>
  );
}
