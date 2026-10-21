import { AppSidebar } from "@/components/playground/app-sidebar";
import { TopBar } from "@/components/playground/top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ModalHost } from "@/practices/accessible-modal/modal-host";
import { Toaster } from "@/practices/toast-notifications/toaster";

export default function PlaygroundLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <TopBar />
        <div className="mx-auto w-full max-w-7xl min-w-0 px-4 py-6 md:px-8 md:py-10">
          {children}
        </div>
      </SidebarInset>
      <Toaster />
      <ModalHost />
    </SidebarProvider>
  );
}
