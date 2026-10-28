"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import { isActive } from "./nav";

/** "Chào {tên}!" and the link to the profile: a row of its own on phones, the top-right corner from `md` up. */
export function AccountLink() {
  const pathname = usePathname();
  const profile = useProfile();
  const name = profile.status === "ready" ? profile.data.displayName : undefined;
  const active = isActive(pathname, "/profile");

  return (
    <div className="order-first flex w-full items-center gap-2 md:order-none md:w-auto md:shrink-0">
      {name ? (
        <p className="flex min-w-0 items-center gap-1.5 text-lg font-semibold md:max-w-xs md:text-base md:font-medium">
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
          "ml-auto size-11 rounded-full md:size-10 aria-[current=page]:border-primary aria-[current=page]:text-primary",
        )}
      >
        <CircleUserRound className="size-5" aria-hidden />
      </Link>
    </div>
  );
}
