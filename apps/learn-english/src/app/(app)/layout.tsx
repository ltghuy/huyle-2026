import { Suspense } from "react";
import { AccountLink } from "@/components/shell/account-link";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { NamePrompt } from "@/components/name/name-prompt";
import { MobileNav } from "@/components/shell/mobile-nav";
import { StorageBanner } from "@/components/shell/storage-banner";
import { StatsRunner } from "@/components/stats/stats-runner";
import { SyncRunner } from "@/components/sync/sync-runner";
import { AppTour } from "@/components/tour/app-tour";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

// Pages with navigation. Focus-mode screens (lessons, review sessions,
// placement test) live outside this group so the navigation stays out of the way.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <StorageBanner />
        <AccountLink />
        {/* Bottom padding keeps content clear of the mobile nav (h-14 + safe area). */}
        <main className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-8">{children}</main>
      </SidebarInset>
      <MobileNav />
      <SyncRunner />
      <StatsRunner />
      <NamePrompt />
      {/* Reads ?tour=1, so it needs a Suspense boundary to keep the pages static. */}
      <Suspense fallback={null}>
        <AppTour />
      </Suspense>
    </SidebarProvider>
  );
}
