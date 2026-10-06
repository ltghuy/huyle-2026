import { SidebarTrigger } from "@/components/ui/sidebar";

export function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <SidebarTrigger aria-label="Toggle practices menu" className="size-11 md:size-9" />
      <span className="text-sm font-semibold md:hidden">React Practices</span>
    </header>
  );
}
