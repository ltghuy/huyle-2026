import { PracticeFrame } from "@/components/playground/practice-frame";
import { getPractice, practiceMetadata } from "@/practices/catalog";
import { Demo } from "@/practices/data-fetching-hook/demo";
import { Explanation } from "@/practices/data-fetching-hook/explanation";

export const metadata = practiceMetadata("data-fetching-hook");

export default function DataFetchingHookPage() {
  return (
    <PracticeFrame
      practice={getPractice("data-fetching-hook")!}
      explanation={<Explanation />}
      demo={<Demo />}
    />
  );
}
