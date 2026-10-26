import { PracticeFrame } from "@/components/playground/practice-frame";
import { getPractice, practiceMetadata } from "@/practices/catalog";
import { Demo } from "@/practices/data-grid/demo";
import { Explanation } from "@/practices/data-grid/explanation";
import { getEmployees } from "@/server/practices/data-grid/employees.data";
import { queryEmployees } from "@/server/practices/data-grid/grid.query";
import { parseViewParams } from "@/server/practices/data-grid/grid.schema";

export const metadata = practiceMetadata("data-grid");

const INITIAL_SIZE = 1000;

// Reads the view from the URL and runs the same query the browser and the
// mock API run, so the first paint already shows the right page: only that
// page crosses to the client, not the dataset.
export default async function DataGridPage({ searchParams }: PageProps<"/react-practices/data-grid">) {
  const view = parseViewParams(await searchParams);
  const result = queryEmployees(getEmployees(INITIAL_SIZE), view);

  return (
    <PracticeFrame
      practice={getPractice("data-grid")!}
      explanation={<Explanation />}
      demo={<Demo initialView={{ ...view, page: result.page }} initialResult={result} initialSize={INITIAL_SIZE} />}
    />
  );
}
