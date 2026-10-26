import { PracticeFrame } from "@/components/playground/practice-frame";
import { getPractice, practiceMetadata } from "@/practices/catalog";
import { Demo } from "@/practices/virtualized-list/demo";
import { Explanation } from "@/practices/virtualized-list/explanation";

export const metadata = practiceMetadata("virtualized-list");

export default function VirtualizedListPage() {
  return (
    <PracticeFrame
      practice={getPractice("virtualized-list")!}
      explanation={<Explanation />}
      demo={<Demo />}
    />
  );
}
