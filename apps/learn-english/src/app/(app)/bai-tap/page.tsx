import type { Metadata } from "next";
import { Suspense } from "react";
import { ExerciseLibrary } from "@/components/library/exercise-library";
import { PageHeader } from "@/components/shell/page-header";
import { ListSkeleton } from "@/components/shell/load-states";

export const metadata: Metadata = { title: "Bài tập" };

export default function BaiTapPage() {
  return (
    <>
      <PageHeader title="Bài tập" description="Tự luyện mọi phần của khóa học." />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <ExerciseLibrary />
      </Suspense>
    </>
  );
}
