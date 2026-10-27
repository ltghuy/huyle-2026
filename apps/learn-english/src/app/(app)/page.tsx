import { ComingSoon } from "@/components/shell/coming-soon";
import { PageHeader } from "@/components/shell/page-header";

export default function HomePage() {
  return (
    <>
      <PageHeader title="Bài học hôm nay" description="Ôn lại bài cũ, học từ mới và luyện câu, mỗi ngày một chút." />
      <ComingSoon />
    </>
  );
}
