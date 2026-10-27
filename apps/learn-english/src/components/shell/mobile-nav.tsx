"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Ellipsis, Info } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { MOBILE_PRIMARY, NAV_ITEMS, isActive } from "./nav";

const PRIMARY = NAV_ITEMS.filter((item) => (MOBILE_PRIMARY as readonly string[]).includes(item.href));
const MORE = NAV_ITEMS.filter((item) => !(MOBILE_PRIMARY as readonly string[]).includes(item.href));

const tabClass = "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium";

/** Bottom navigation for phones: four destinations plus "Thêm" for the rest. */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = MORE.some((item) => isActive(pathname, item.href));

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="flex">
        {PRIMARY.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                data-tour={item.tour}
                aria-current={active ? "page" : undefined}
                className={cn(tabClass, active ? "text-primary" : "text-muted-foreground")}
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              data-tour="more"
              className={cn(tabClass, moreActive ? "text-primary" : "text-muted-foreground")}
            >
              <Ellipsis className="size-5" aria-hidden />
              Thêm
            </SheetTrigger>
            <SheetContent side="bottom" className="pb-[env(safe-area-inset-bottom)]">
              <SheetHeader>
                <SheetTitle>Thêm</SheetTitle>
              </SheetHeader>
              <ul className="grid gap-1 px-4 pb-4">
                {[...MORE, { href: "/nguon-du-lieu", label: "Nguồn dữ liệu", icon: Info, tour: "credits" }].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      data-tour={`${item.tour}-mobile`}
                      onClick={() => setOpen(false)}
                      aria-current={isActive(pathname, item.href) ? "page" : undefined}
                      className="flex min-h-12 items-center gap-3 rounded-lg px-3 hover:bg-muted aria-[current=page]:text-primary"
                    >
                      <item.icon className="size-5" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
