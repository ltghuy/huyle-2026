"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { practiceHref, PRACTICES_PATH, sections } from "@/practices/catalog";

import { SectionIcon } from "./section-icon";

export type PracticeNavItem = {
  slug: string;
  number: number;
  title: string;
  built: boolean;
};

const practicesSection = sections.find((s) => s.id === "react-practices")!;
const upcomingSections = sections.filter((s) => s.href === null);

/**
 * The handbook's sections. React Practices is a folder holding the 14
 * practices; sections without content are listed as coming soon. The filter
 * narrows practices (and section names) by text.
 */
export function PracticeNav({ items }: { items: PracticeNavItem[] }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const [query, setQuery] = useState("");
  // Collapsing sticks only on the page where it happened: opening a practice re-opens the folder.
  const [collapsedOn, setCollapsedOn] = useState<string | null>(null);

  function handleNavigate() {
    if (isMobile) setOpenMobile(false);
  }

  const needle = query.trim().toLowerCase();
  const filtering = needle !== "";
  const visible = filtering ? items.filter((item) => item.title.toLowerCase().includes(needle)) : items;
  const upcoming = filtering ? upcomingSections.filter((s) => s.title.toLowerCase().includes(needle)) : upcomingSections;
  const open = filtering || collapsedOn !== pathname;
  const sectionActive = pathname === PRACTICES_PATH;

  function handleOpenChange(next: boolean) {
    setCollapsedOn(next ? null : pathname);
  }

  return (
    <>
      <SidebarGroup className="py-0">
        <label htmlFor="practice-filter" className="sr-only">
          Filter practices
        </label>
        <SidebarInput
          id="practice-filter"
          type="search"
          placeholder="Filter practices…"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Sections</SidebarGroupLabel>
        <SidebarGroupContent>
          {visible.length === 0 && upcoming.length === 0 ? (
            <div className="flex flex-col items-start gap-2 px-2 py-3 text-sm text-muted-foreground">
              <p role="status">No matches for “{query.trim()}”.</p>
              <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                Clear filter
              </Button>
            </div>
          ) : (
            <SidebarMenu aria-label="Handbook sections">
              {visible.length > 0 ? (
                <Collapsible open={open} onOpenChange={handleOpenChange} render={<SidebarMenuItem />}>
                  <SidebarMenuButton
                    isActive={sectionActive}
                    aria-current={sectionActive ? "page" : undefined}
                    render={<Link href={PRACTICES_PATH} onClick={handleNavigate} />}
                  >
                    <SectionIcon id="react-practices" />
                    <span className="truncate">{practicesSection.title}</span>
                  </SidebarMenuButton>
                  <CollapsibleTrigger
                    render={<SidebarMenuAction />}
                    aria-label={`${open ? "Hide" : "Show"} ${practicesSection.title}`}
                    className="data-[panel-open]:rotate-90"
                  >
                    <ChevronRight aria-hidden />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub aria-label="Practices" className="mr-0 pr-0">
                      {visible.map((item) => {
                        const href = practiceHref(item.slug);
                        const active = pathname === href;
                        return (
                          <SidebarMenuSubItem key={item.slug}>
                            <SidebarMenuSubButton
                              isActive={active}
                              aria-current={active ? "page" : undefined}
                              title={item.title}
                              render={<Link href={href} onClick={handleNavigate} />}
                            >
                              <span
                                aria-hidden
                                className="w-5 shrink-0 font-mono text-xs text-muted-foreground tabular-nums in-data-active:text-sidebar-accent-foreground"
                              >
                                {String(item.number).padStart(2, "0")}
                              </span>
                              <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", item.built ? "bg-success" : "bg-border")} />
                              <span className="truncate">
                                {item.title}
                                {item.built ? null : <span className="sr-only"> (coming soon)</span>}
                              </span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
              {upcoming.map((section) => (
                <SidebarMenuItem key={section.id}>
                  <div className="flex min-h-8 items-center gap-2 rounded-md px-2 py-1.5 text-sm leading-tight text-muted-foreground [&>svg]:size-4 [&>svg]:shrink-0">
                    <SectionIcon id={section.id} />
                    <span className="min-w-0">{section.title}</span>
                    <span className="ml-auto shrink-0 rounded border px-1 text-[0.6875rem] leading-4">
                      Soon<span className="sr-only">: coming soon</span>
                    </span>
                  </div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          )}
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}
