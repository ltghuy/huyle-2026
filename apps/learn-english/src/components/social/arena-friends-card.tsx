"use client";

import { cn } from "@/lib/utils";
import { FriendsList } from "./friends-list";
import { useSocial } from "./use-social";

/** Friends on the Đấu trường page for phones, which have no sidebar (feature 031, AC-017). */
export function ArenaFriendsCard({ className }: { className?: string }) {
  const { signedIn } = useSocial();
  if (!signedIn) return null;
  return (
    <div className={cn("rounded-2xl border bg-card p-4 md:hidden", className)}>
      <FriendsList listClassName="max-h-80" />
    </div>
  );
}
