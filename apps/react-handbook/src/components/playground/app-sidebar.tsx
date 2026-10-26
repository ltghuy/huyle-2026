import { BookOpenText } from "lucide-react";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { practices, SITE_NAME, topicPages } from "@/practices/catalog";

import { PracticeNav } from "./practice-nav";

export function AppSidebar() {
  return (
    <Sidebar aria-label="Handbook navigation">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="h-auto min-h-12 py-2" render={<Link href="/" />}>
              <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <BookOpenText aria-hidden className="size-4" />
              </span>
              <span className="flex min-w-0 flex-col gap-1 leading-none">
                <span className="leading-tight font-semibold">{SITE_NAME}</span>
                <span className="text-xs text-muted-foreground">
                  {practices.length} practices · {topicPages.length} topics
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <PracticeNav />
      </SidebarContent>
    </Sidebar>
  );
}
