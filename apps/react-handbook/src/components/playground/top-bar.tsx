import { SidebarTrigger } from "@/components/ui/sidebar";
import { SITE_NAME } from "@/practices/catalog";

import { ThemeToggle } from "./theme-toggle";

export function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <SidebarTrigger aria-label="Toggle navigation menu" className="size-11 md:size-9" />
      <span className="truncate text-sm font-semibold md:hidden">{SITE_NAME}</span>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}
