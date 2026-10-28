import type { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AccountLink } from "./account-link";

/**
 * Title bar shared by the app's pages; the sidebar toggle shows on desktop only.
 * The greeting and profile link sit in their own row above the title on phones,
 * and at the right of the title row from `md` up.
 */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start gap-x-3 gap-y-3 px-4 pt-3 pb-4 md:flex-nowrap md:px-8 md:pt-6">
      <SidebarTrigger className="mt-1 hidden md:inline-flex" aria-label="Thu gọn hoặc mở thanh bên" />
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-muted-foreground">{description}</p> : null}
      </div>
      {actions}
      <AccountLink />
    </header>
  );
}
