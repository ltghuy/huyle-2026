import { PracticeFrame } from "@/components/playground/practice-frame";
import { getPractice, practiceMetadata } from "@/practices/catalog";
import { Demo } from "@/practices/infinite-scroll/demo";
import { Explanation } from "@/practices/infinite-scroll/explanation";

export const metadata = practiceMetadata("infinite-scroll");

export default function InfiniteScrollPage() {
  return (
    <PracticeFrame
      practice={getPractice("infinite-scroll")!}
      explanation={<Explanation />}
      demo={<Demo />}
    />
  );
}
