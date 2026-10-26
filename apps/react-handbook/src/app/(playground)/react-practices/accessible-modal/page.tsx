import { PracticeFrame } from "@/components/playground/practice-frame";
import { Demo } from "@/practices/accessible-modal/demo";
import { Explanation } from "@/practices/accessible-modal/explanation";
import { getPractice, practiceMetadata } from "@/practices/catalog";

export const metadata = practiceMetadata("accessible-modal");

export default function AccessibleModalPage() {
  return (
    <PracticeFrame
      practice={getPractice("accessible-modal")!}
      explanation={<Explanation />}
      demo={<Demo />}
    />
  );
}
