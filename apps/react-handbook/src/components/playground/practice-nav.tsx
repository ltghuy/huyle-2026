"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
import { sections } from "@/practices/catalog";

import { NAV_FOLDERS, type NavFolder } from "./nav-folders";
import { SectionIcon } from "./section-icon";

const upcomingSections = sections.filter((s) => s.href === null);

/**
 * The handbook's sections. Sections with content are folders listing their
 * pages; sections without content are listed as coming soon. Searching the
 * pages lives in the top bar (SiteSearch).
 */
export function PracticeNav() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  function handleNavigate() {
    if (isMobile) setOpenMobile(false);
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Sections</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu aria-label="Handbook sections">
          {NAV_FOLDERS.map((folder) => (
            <SectionFolder key={folder.id} folder={folder} pathname={pathname} onNavigate={handleNavigate} />
          ))}
          {upcomingSections.map((section) => (
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
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function SectionFolder({
  folder,
  pathname,
  onNavigate,
}: {
  folder: NavFolder;
  pathname: string;
  onNavigate: () => void;
}) {
  // Collapsing sticks only on the page where it happened: opening another page re-opens the folder.
  const [collapsedOn, setCollapsedOn] = useState<string | null>(null);
  const open = collapsedOn !== pathname;
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
        render={<Link href={folder.href} prefetch={false} onClick={onNavigate} />}
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
                  render={<Link href={item.href} prefetch={false} onClick={onNavigate} />}
                >
                  {item.prefix ? (
                    <span
                      aria-hidden
                      className="w-5 shrink-0 font-mono text-xs text-muted-foreground tabular-nums in-data-active:text-sidebar-accent-foreground"
                    >
                      {item.prefix}
                    </span>
                  ) : null}
                  {/* Only the current page gets a dot; the others keep its space so titles stay aligned. */}
                  <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", active ? "bg-success" : "bg-transparent")} />
                  <span className={cn("truncate", !item.ready && "text-muted-foreground")}>
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
