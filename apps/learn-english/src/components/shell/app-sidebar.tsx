"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Info } from "lucide-react";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NAV_ITEMS, isActive } from "./nav";

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const toggleLabel = state === "expanded" ? "Thu gọn thanh bên" : "Mở rộng thanh bên";
  return (
    // Floating: a rounded panel off the screen edge (quick 013). The inner
    // panel is CLI-styled `rounded-lg`; match the cards' `rounded-2xl` here.
    <Sidebar collapsible="icon" variant="floating" className="hidden md:flex [&_[data-slot=sidebar-inner]]:rounded-2xl">
      {/* The toggle sits right of the name; collapsed, it goes under the logo (quick 019). */}
      <SidebarHeader className="flex-row items-center gap-1 group-data-[collapsible=icon]:flex-col">
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 font-semibold group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <GraduationCap className="size-6 shrink-0 text-primary" aria-hidden />
          <span className="truncate group-data-[collapsible=icon]:hidden">English with Evan</span>
        </Link>
        <SidebarTrigger aria-label={toggleLabel} title={toggleLabel} className="shrink-0 text-muted-foreground" />
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
        {/* A menu row like the items above, so its icon and label line up with theirs (quick 015). */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/credits" />}
              isActive={isActive(pathname, "/credits")}
              tooltip="Nguồn dữ liệu"
              className="text-xs text-muted-foreground group-data-[collapsible=icon]:justify-center"
            >
              <Info aria-hidden />
              <span className="group-data-[collapsible=icon]:hidden">Nguồn dữ liệu</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
