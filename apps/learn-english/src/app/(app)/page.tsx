import { PageHeader } from "@/components/shell/page-header";
import { TodayLesson } from "@/components/lesson/today-lesson";

export default function HomePage() {
  return (
    <>
      <PageHeader title="Bài học hôm nay" description="Ôn lại bài cũ, học từ mới và luyện câu, mỗi ngày một chút." />
      <TodayLesson />
    </>
  );
}
