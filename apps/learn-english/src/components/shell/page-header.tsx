import type { ReactNode } from "react";

/**
 * Title bar shared by the app's pages (the sidebar toggle lives in the sidebar, quick 019).
 * It leaves room for the greeting and profile link pinned to the top-right
 * corner (AccountLink): a row of its own above the title (quick 017).
 */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex items-start gap-3 px-4 pt-[4.25rem] pb-4 md:px-8 md:pt-[4.75rem]">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-muted-foreground">{description}</p> : null}
      </div>
      {actions}
    </header>
  );
}
