"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type PracticeNavItem = {
  slug: string;
  number: number;
  title: string;
  built: boolean;
};

export function PracticeNav({ items }: { items: PracticeNavItem[] }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? items.filter((item) => item.title.toLowerCase().includes(needle))
    : items;

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
        <SidebarGroupContent>
          {visible.length === 0 ? (
            <div className="flex flex-col items-start gap-2 px-2 py-3 text-sm text-muted-foreground">
              <p role="status">No matches for “{query.trim()}”.</p>
              <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                Clear filter
              </Button>
            </div>
          ) : (
            <SidebarMenu aria-label="Practices">
              {visible.map((item) => {
                const href = `/practices/${item.slug}`;
                const active = pathname === href;
                return (
                  <SidebarMenuItem key={item.slug}>
                    <SidebarMenuButton
                      isActive={active}
                      aria-current={active ? "page" : undefined}
                      title={item.title}
                      render={
                        <Link
                          href={href}
                          onClick={() => {
                            if (isMobile) setOpenMobile(false);
                          }}
                        />
                      }
                    >
                      <span
                        aria-hidden
                        className="w-5 shrink-0 font-mono text-xs text-muted-foreground tabular-nums"
                      >
                        {String(item.number).padStart(2, "0")}
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          item.built ? "bg-success" : "bg-border",
                        )}
                      />
                      <span className="truncate">
                        {item.title}
                        {item.built ? null : (
                          <span className="sr-only"> (coming soon)</span>
                        )}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          )}
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}
