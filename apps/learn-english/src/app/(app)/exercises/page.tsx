import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { Suspense } from "react";
import { ExerciseLibrary } from "@/components/library/exercise-library";
import { PageHeader } from "@/components/shell/page-header";
import { ListSkeleton } from "@/components/shell/load-states";

export const metadata: Metadata = pageMetadata({ title: "Bài tập", path: "/exercises", description: "Bài tập tiếng Anh theo trình độ, chủ đề và điểm ngữ pháp: trắc nghiệm, điền chữ, nghe và sắp xếp câu." });

export default function ExercisesPage() {
  return (
    <>
      <PageHeader title="Bài tập" description="Tự luyện mọi phần của khóa học." />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <ExerciseLibrary />
      </Suspense>
    </>
  );
}
