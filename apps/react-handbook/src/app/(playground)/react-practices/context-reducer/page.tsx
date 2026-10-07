import { PracticeFrame } from "@/components/playground/practice-frame";
import { getPractice, practiceMetadata } from "@/practices/catalog";
import { Demo } from "@/practices/context-reducer/demo";
import { Explanation } from "@/practices/context-reducer/explanation";

export const metadata = practiceMetadata("context-reducer");

export default function ContextReducerPage() {
  return (
    <PracticeFrame
      practice={getPractice("context-reducer")!}
      explanation={<Explanation />}
      demo={<Demo />}
    />
  );
}
