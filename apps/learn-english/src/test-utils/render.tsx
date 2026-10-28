import { render as baseRender, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { QueryProvider } from "@/components/query-provider";

/**
 * Testing Library's `render` inside the app's QueryProvider. Each call gets
 * its own cache, so nothing remembered in one test leaks into the next.
 */
export function render(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return baseRender(ui, { ...options, wrapper: QueryProvider });
}
