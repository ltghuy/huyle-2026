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
import { sections, type SectionId } from "@/practices/catalog";

import { SectionIcon } from "./section-icon";

export type NavItem = {
  href: string;
  title: string;
  /** Shown before the title, e.g. a practice number. */
  prefix?: string;
  /** Built practice or written page; the rest are marked coming soon. */
  ready: boolean;
};

export type NavFolder = {
  id: SectionId;
  title: string;
  href: string;
  /** Accessible name of the folder's list, e.g. "Practices". */
  itemsLabel: string;
  items: NavItem[];
};

const upcomingSections = sections.filter((s) => s.href === null);

/**
 * The handbook's sections. Sections with content are folders listing their
 * pages; sections without content are listed as coming soon. The filter
 * narrows pages (and coming-soon section names) by text.
 */
export function PracticeNav({ folders }: { folders: NavFolder[] }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const [query, setQuery] = useState("");

  function handleNavigate() {
    if (isMobile) setOpenMobile(false);
  }

  const needle = query.trim().toLowerCase();
  const filtering = needle !== "";
  const visibleFolders = folders
    .map((folder) => ({ ...folder, items: filtering ? folder.items.filter((item) => item.title.toLowerCase().includes(needle)) : folder.items }))
    .filter((folder) => folder.items.length > 0);
  const upcoming = filtering ? upcomingSections.filter((s) => s.title.toLowerCase().includes(needle)) : upcomingSections;

  return (
    <>
      <SidebarGroup className="py-0">
        <label htmlFor="practice-filter" className="sr-only">
          Filter pages
        </label>
        <SidebarInput
          id="practice-filter"
          type="search"
          placeholder="Filter pages…"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Sections</SidebarGroupLabel>
        <SidebarGroupContent>
          {visibleFolders.length === 0 && upcoming.length === 0 ? (
            <div className="flex flex-col items-start gap-2 px-2 py-3 text-sm text-muted-foreground">
              <p role="status">No matches for “{query.trim()}”.</p>
              <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                Clear filter
              </Button>
            </div>
          ) : (
            <SidebarMenu aria-label="Handbook sections">
              {visibleFolders.map((folder) => (
                <SectionFolder key={folder.id} folder={folder} pathname={pathname} forceOpen={filtering} onNavigate={handleNavigate} />
              ))}
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

function SectionFolder({
  folder,
  pathname,
  forceOpen,
  onNavigate,
}: {
  folder: NavFolder;
  pathname: string;
  forceOpen: boolean;
  onNavigate: () => void;
}) {
  // Collapsing sticks only on the page where it happened: opening another page re-opens the folder.
  const [collapsedOn, setCollapsedOn] = useState<string | null>(null);
  const open = forceOpen || collapsedOn !== pathname;
  const sectionActive = pathname === folder.href;

  function handleOpenChange(next: boolean) {
    setCollapsedOn(next ? null : pathname);
  }

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange} render={<SidebarMenuItem />}>
      <SidebarMenuButton
        isActive={sectionActive}
        aria-current={sectionActive ? "page" : undefined}
        title={folder.title}
        render={<Link href={folder.href} onClick={onNavigate} />}
      >
        <SectionIcon id={folder.id} />
        <span className="truncate">{folder.title}</span>
      </SidebarMenuButton>
      <CollapsibleTrigger
        render={<SidebarMenuAction />}
        aria-label={`${open ? "Hide" : "Show"} ${folder.title}`}
        className="data-[panel-open]:rotate-90"
      >
        <ChevronRight aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub aria-label={folder.itemsLabel} className="mr-0 pr-0">
          {folder.items.map((item) => {
            const active = pathname === item.href;
            return (
              <SidebarMenuSubItem key={item.href}>
                <SidebarMenuSubButton
                  isActive={active}
                  aria-current={active ? "page" : undefined}
                  title={item.title}
                  render={<Link href={item.href} onClick={onNavigate} />}
                >
                  {item.prefix ? (
                    <span
                      aria-hidden
                      className="w-5 shrink-0 font-mono text-xs text-muted-foreground tabular-nums in-data-active:text-sidebar-accent-foreground"
                    >
                      {item.prefix}
                    </span>
                  ) : null}
                  <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", item.ready ? "bg-success" : "bg-border")} />
                  <span className="truncate">
                    {item.title}
                    {item.ready ? null : <span className="sr-only"> (coming soon)</span>}
                  </span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}
