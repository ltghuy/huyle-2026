import { PracticeFrame } from "@/components/playground/practice-frame";
import { getPractice, practiceMetadata } from "@/practices/catalog";
import { Demo } from "@/practices/large-dataset/demo";
import { Explanation } from "@/practices/large-dataset/explanation";

export const metadata = practiceMetadata("large-dataset-performance");

// The dataset loads in the browser: what this practice measures is the
// client's rendering, and 20,000 rows don't belong in the HTML.
export default function LargeDatasetPerformancePage() {
  return (
    <PracticeFrame
      practice={getPractice("large-dataset-performance")!}
      explanation={<Explanation />}
      demo={<Demo />}
    />
  );
}
