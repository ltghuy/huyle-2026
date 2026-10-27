import type { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

/** Title bar shared by the app's pages; the sidebar toggle shows on desktop only. */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex items-start gap-3 px-4 pt-6 pb-4 md:px-8">
      <SidebarTrigger className="mt-1 hidden md:inline-flex" aria-label="Thu gọn hoặc mở thanh bên" />
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-muted-foreground">{description}</p> : null}
      </div>
      {actions}
    </header>
  );
}
