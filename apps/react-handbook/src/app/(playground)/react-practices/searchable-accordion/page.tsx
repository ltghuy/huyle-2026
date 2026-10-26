import { PracticeFrame } from "@/components/playground/practice-frame";
import { getPractice, practiceMetadata } from "@/practices/catalog";
import { Demo } from "@/practices/searchable-accordion/demo";
import { Explanation } from "@/practices/searchable-accordion/explanation";

export const metadata = practiceMetadata("searchable-accordion");

export default function SearchableAccordionPage() {
  return (
    <PracticeFrame
      practice={getPractice("searchable-accordion")!}
      explanation={<Explanation />}
      demo={<Demo />}
    />
  );
}
