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
    // Floating: a rounded panel off the screen edge (quick 013). The inner
    // panel is CLI-styled `rounded-lg`; match the cards' `rounded-2xl` here.
    <Sidebar collapsible="icon" variant="floating" className="hidden md:flex [&_[data-slot=sidebar-inner]]:rounded-2xl">
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 rounded-md px-2 py-1.5 font-semibold group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <GraduationCap className="size-6 shrink-0 text-primary" aria-hidden />
          <span className="truncate group-data-[collapsible=icon]:hidden">English with Evan</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {/* A gap so a hovered item never touches the active one. */}
            <SidebarMenu className="gap-1">
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
