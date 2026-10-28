"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import { isActive } from "./nav";

/**
 * "Chào {tên}!" and the link to the profile, pinned to the top-right corner
 * of every page with navigation while it scrolls (quick 012). The zero-height
 * sticky row keeps it out of the page flow; PageHeader leaves room for it.
 * Behind it, a blurred band as tall as that room covers the content that
 * scrolls up under the corner (quick 018); it doesn't take clicks.
 */
export function AccountLink() {
  const pathname = usePathname();
  const profile = useProfile();
  const name = profile.status === "ready" ? profile.data.displayName : undefined;
  const active = isActive(pathname, "/profile");

  return (
    <div className="pointer-events-none sticky top-0 z-30 h-0">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[4.25rem] bg-background/70 mask-b-from-70% backdrop-blur-md md:h-[4.75rem]"
      />
      <div className="pointer-events-auto absolute top-3 right-4 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-full bg-background/80 p-1 shadow-sm ring-1 ring-border/60 backdrop-blur md:top-5 md:right-8">
        {name ? (
          <p className="flex min-w-0 items-center gap-1.5 pl-2 font-medium">
            <span className="inline-block origin-[70%_70%] animate-wave" aria-hidden>
              👋
            </span>
            <span className="truncate">Chào {name}!</span>
          </p>
        ) : null}
        <Link
          href="/profile"
          data-tour="profile"
          aria-label="Hồ sơ"
          title="Hồ sơ"
          aria-current={active ? "page" : undefined}
          className={cn(
            buttonVariants({ variant: "outline", size: "icon-lg" }),
            "size-11 shrink-0 rounded-full md:size-10 aria-[current=page]:border-primary aria-[current=page]:text-primary",
          )}
        >
          <CircleUserRound className="size-5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
