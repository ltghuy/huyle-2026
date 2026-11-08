import { SignInGate } from "@/components/account/sign-in-gate";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { ExtraLessonPlayer } from "@/components/lesson/extra-lesson-player";

export const metadata: Metadata = pageMetadata({ title: "Bài học thêm", path: "/extra-lesson", description: "Bài học thêm bạn đổi bằng điểm.", index: false });

export default function ExtraLessonPage() {
  return (
    <SignInGate area="lesson" className="mx-auto max-w-xl py-16" mascot>
      <ExtraLessonPlayer />
    </SignInGate>
  );
}
