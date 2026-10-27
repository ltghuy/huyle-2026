import type { Metadata } from "next";
import { LessonPlayer } from "@/components/lesson/lesson-player";

export const metadata: Metadata = { title: "Bài học hôm nay" };

export default function LessonPage() {
  return <LessonPlayer />;
}
