import { PracticeFrame } from "@/components/playground/practice-frame";
import { getPractice, practiceMetadata } from "@/practices/catalog";
import { Demo } from "@/practices/lazy-images/demo";
import { Explanation } from "@/practices/lazy-images/explanation";

export const metadata = practiceMetadata("lazy-images");

export default function LazyImagesPage() {
  return (
    <PracticeFrame
      practice={getPractice("lazy-images")!}
      explanation={<Explanation />}
      demo={<Demo />}
    />
  );
}
