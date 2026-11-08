"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight, GraduationCap, Info } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarFriends } from "@/components/social/sidebar-friends";
import { LIBRARY_GROUP, NAV_ITEMS, type NavItem, isActive } from "./nav";

const inLibrary = (href: string) => (LIBRARY_GROUP.hrefs as readonly string[]).includes(href);
const LIBRARY_ITEMS = NAV_ITEMS.filter((item) => inLibrary(item.href));
/** Where the group's row goes: in place of its first item. */
const LIBRARY_AT = NAV_ITEMS.findIndex((item) => inLibrary(item.href));

function NavButton({ item, pathname }: { item: NavItem; pathname: string }) {
  return (
    <SidebarMenuItem>
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
  );
}

/** "Thư viện": the study pages under one row, closed until opened or one of them is the current page. */
function LibraryGroup({ pathname }: { pathname: string }) {
  const current = LIBRARY_ITEMS.some((item) => isActive(pathname, item.href));
  const [open, setOpen] = useState(current);
  // Open it when the learner lands on one of its pages; they can still close it there.
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    if (current) setOpen(true);
  }
  return (
    <Collapsible open={open} onOpenChange={setOpen} render={<SidebarMenuItem />}>
      <CollapsibleTrigger
        render={
          <SidebarMenuButton
            size="lg"
            // Closed, the row shows the current page's highlight and stands in for its items in the tour.
            isActive={current && !open}
            data-tour-fallback={LIBRARY_ITEMS.map((item) => item.tour).join(" ")}
          />
        }
      >
        <LIBRARY_GROUP.icon aria-hidden />
        <span>{LIBRARY_GROUP.label}</span>
        <ChevronRight
          aria-hidden
          className="ml-auto transition-transform duration-200 [[data-panel-open]>&]:rotate-90"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {/* No right indent, so "Động từ bất quy tắc" fits on one line. */}
        <SidebarMenuSub className="mt-1 mr-0 pr-0">
          {LIBRARY_ITEMS.map((item) => (
            <SidebarMenuSubItem key={item.href}>
              <SidebarMenuSubButton
                render={<Link href={item.href} data-tour={item.tour} />}
                isActive={isActive(pathname, item.href)}
                className="h-9"
              >
                <item.icon aria-hidden />
                <span>{item.label}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}


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
          <span className="truncate group-data-[collapsible=icon]:hidden">Tuxedo English</span>
        </Link>
        <SidebarTrigger aria-label={toggleLabel} title={toggleLabel} className="shrink-0 text-muted-foreground" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {/* A gap so a hovered item never touches the active one. */}
            <SidebarMenu className="gap-1">
              {NAV_ITEMS.map((item, i) => {
                // Collapsed to icons there is no room for a sub-list, so the group's items show as icons.
                if (state === "collapsed" || !inLibrary(item.href)) {
                  return <NavButton key={item.href} item={item} pathname={pathname} />;
                }
                return i === LIBRARY_AT ? <LibraryGroup key="library" pathname={pathname} /> : null;
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* Friends and who is online, signed-in learners only (feature 031). */}
        <SidebarFriends />
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
              {/* The app version from package.json, at the row's right end (quick 022). */}
              <span className="ml-auto tabular-nums group-data-[collapsible=icon]:hidden">
                v{process.env.NEXT_PUBLIC_APP_VERSION}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
