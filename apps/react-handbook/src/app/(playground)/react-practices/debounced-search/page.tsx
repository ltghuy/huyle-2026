import { PracticeFrame } from "@/components/playground/practice-frame";
import { getPractice, practiceMetadata } from "@/practices/catalog";
import { Demo } from "@/practices/debounced-search/demo";
import { Explanation } from "@/practices/debounced-search/explanation";
import { MAX_QUERY_LENGTH } from "@/server/practices/debounced-search/search.schema";

export const metadata = practiceMetadata("debounced-search");

// Reads `?q=` on the server so a shared link renders with the box filled.
export default async function DebouncedSearchPage({
  searchParams,
}: PageProps<"/react-practices/debounced-search">) {
  const { q } = await searchParams;
  const initialQuery = typeof q === "string" ? q.slice(0, MAX_QUERY_LENGTH) : "";

  return (
    <PracticeFrame
      practice={getPractice("debounced-search")!}
      explanation={<Explanation />}
      demo={<Demo initialQuery={initialQuery} />}
    />
  );
}
