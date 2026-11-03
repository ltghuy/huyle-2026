import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { Suspense } from "react";
import { ExerciseLibrary } from "@/components/library/exercise-library";
import { Dumbbell } from "lucide-react";
import { Owl } from "@/components/mascot/owl";
import { PageHero } from "@/components/shell/page-hero";
import { ListSkeleton } from "@/components/shell/load-states";

const BADGE = { icon: Dumbbell, text: "Chọn bài theo trình độ và chủ đề" };

export const metadata: Metadata = pageMetadata({ title: "Bài tập", path: "/exercises", description: "Bài tập tiếng Anh theo trình độ, chủ đề và điểm ngữ pháp: trắc nghiệm, điền chữ, nghe và sắp xếp câu." });

export default function ExercisesPage() {
  return (
    <>
      <PageHero size="sm" badge={BADGE} title="Bài tập" description="Tự luyện mọi phần của khóa học, mỗi bài 10 câu." mascot={<Owl mood="happy" size="hero" />} />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <ExerciseLibrary />
      </Suspense>
    </>
  );
}
