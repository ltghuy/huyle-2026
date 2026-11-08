"use client";

import { Users } from "lucide-react";
import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { FriendsList } from "./friends-list";
import { useSocial } from "./use-social";

// The sidebar's "Bạn bè" section (feature 031, AC-010, AC-011): under the navigation, taking the
// height left and scrolling on its own. Collapsed to icons, one button shows how many friends are
// online and opens the sidebar.

function CollapsedFriends() {
  const { query } = useSocial();
  const { setOpen } = useSidebar();
  const online = query.data?.friends.filter((friend) => friend.online).length ?? 0;
  const label = online > 0 ? `Bạn bè: ${online} đang trực tuyến` : "Bạn bè";
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" tooltip={label} aria-label={label} onClick={() => setOpen(true)} className="relative justify-center">
          <Users aria-hidden />
          {online > 0 ? (
            <span aria-hidden className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-success px-1 text-[10px] leading-4 font-semibold text-white tabular-nums">
              {online}
            </span>
          ) : null}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function SidebarFriends() {
  const { signedIn } = useSocial();
  const { state } = useSidebar();
  if (!signedIn) return null;
  return (
    <SidebarGroup className="min-h-48 flex-1 border-t border-sidebar-border pt-3">
      {state === "collapsed" ? <CollapsedFriends /> : <FriendsList className="min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]" />}
    </SidebarGroup>
  );
}
