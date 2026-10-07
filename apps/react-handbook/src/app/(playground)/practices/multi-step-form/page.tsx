import { PracticeFrame } from "@/components/playground/practice-frame";
import { getPractice, practiceMetadata } from "@/practices/catalog";
import { Demo } from "@/practices/multi-step-form/demo";
import { Explanation } from "@/practices/multi-step-form/explanation";

export const metadata = practiceMetadata("multi-step-form");

export default function MultiStepFormPage() {
  return (
    <PracticeFrame
      practice={getPractice("multi-step-form")!}
      explanation={<Explanation />}
      demo={<Demo />}
    />
  );
}
