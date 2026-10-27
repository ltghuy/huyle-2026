import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { LessonPlayer } from "@/components/lesson/lesson-player";

export const metadata: Metadata = pageMetadata({ title: "Bài học hôm nay", path: "/lesson", description: "Bài học tiếng Anh hôm nay của bạn.", index: false });

export default function LessonPage() {
  return <LessonPlayer />;
}
