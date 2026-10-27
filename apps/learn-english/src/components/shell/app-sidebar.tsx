"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NAV_ITEMS, isActive } from "./nav";

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon" className="hidden md:flex">
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 rounded-md px-2 py-1.5 font-semibold group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <GraduationCap className="size-6 shrink-0 text-primary" aria-hidden />
          <span className="truncate group-data-[collapsible=icon]:hidden">English with Evan</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} data-tour={item.tour} />}
                    isActive={isActive(pathname, item.href)}
                    tooltip={item.label}
                    size="lg"
                    // `lg` drops the padding when collapsed; centre the icon and hide the label instead.
                    className="group-data-[collapsible=icon]:justify-center"
                  >
                    <item.icon aria-hidden />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Link
          href="/credits"
          className="px-2 py-1 text-xs text-muted-foreground underline-offset-4 hover:underline group-data-[collapsible=icon]:hidden"
        >
          Nguồn dữ liệu
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
