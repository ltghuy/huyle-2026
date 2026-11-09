"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { SignInGate } from "@/components/account/sign-in-gate";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminError, fetchOverview } from "@/lib/admin-client";
import { ADMIN_MESSAGES } from "@/server/admin/admin.schema";
import { ClaimsTab } from "./claims-tab";
import { ContentTab } from "./content-tab";
import { OverviewTab } from "./overview-tab";

// The admin page (feature 038). Guests get the sign-in prompt; a signed-in learner who isn't an
// admin gets the no-access message from the first admin route that refuses them (AC-002).

export const ADMIN_TABS = ["overview", "claims", "content"] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];
export const OVERVIEW_KEY = ["admin", "overview"] as const;

function tabOf(value: string | null): AdminTab {
  return (ADMIN_TABS as readonly string[]).includes(value ?? "") ? (value as AdminTab) : "overview";
}

function NoAccess({ message }: { message: string }) {
  return (
    <div role="alert" className="mx-auto grid max-w-md justify-items-center gap-3 py-24 text-center">
      <ShieldAlert aria-hidden className="size-10 text-muted-foreground" />
      <p className="text-lg font-semibold">{message}</p>
    </div>
  );
}

function AdminTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const tab = tabOf(useSearchParams().get("tab"));
  // Today's overview doubles as the access check: it is the cheapest admin route.
  const access = useQuery({ queryKey: [...OVERVIEW_KEY, "today"], queryFn: () => fetchOverview("today"), retry: false });

  function handleTabChange(value: unknown) {
    router.replace(`${pathname}?tab=${tabOf(String(value))}`, { scroll: false });
  }

  if (access.isPending) {
    return (
      <div role="status" className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 aria-hidden className="size-5 animate-spin" /> Đang tải…
      </div>
    );
  }
  if (access.error) {
    const refused = access.error instanceof AdminError && (access.error.status === 401 || access.error.status === 403);
    return <NoAccess message={refused ? ADMIN_MESSAGES.forbidden : access.error.message} />;
  }
  const pending = access.data.pendingClaims;
  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="gap-4">
      <TabsList aria-label="Mục quản trị" className="w-full sm:w-auto">
        <TabsTrigger value="overview">Tổng quan</TabsTrigger>
        <TabsTrigger value="claims" className="gap-1.5">
          Duyệt câu
          {pending > 0 ? (
            <Badge variant="secondary" className="tabular-nums">
              {pending}
            </Badge>
          ) : null}
        </TabsTrigger>
        <TabsTrigger value="content">Nội dung</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <OverviewTab />
      </TabsContent>
      <TabsContent value="claims">
        <ClaimsTab />
      </TabsContent>
      <TabsContent value="content">
        <ContentTab />
      </TabsContent>
    </Tabs>
  );
}

export function AdminScreen() {
  return (
    <SignInGate area="admin">
      <div className="px-4 pb-10 md:px-8">
        <AdminTabs />
      </div>
    </SignInGate>
  );
}
