import { Atom } from "lucide-react";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { builtCount, practices } from "@/practices/catalog";

import { PracticeNav, type PracticeNavItem } from "./practice-nav";

export function AppSidebar() {
  const items: PracticeNavItem[] = practices.map((p) => ({
    slug: p.slug,
    number: p.number,
    title: p.title,
    built: p.built,
  }));

  return (
    <Sidebar aria-label="Practice navigation">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Atom aria-hidden className="size-4" />
              </span>
              <span className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">React Practices</span>
                <span className="text-xs text-muted-foreground">
                  {builtCount} of {practices.length} built
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <PracticeNav items={items} />
      </SidebarContent>
    </Sidebar>
  );
}
