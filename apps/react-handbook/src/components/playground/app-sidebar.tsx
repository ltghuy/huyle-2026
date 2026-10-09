import { BookOpenText } from "lucide-react";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  builtCount,
  practiceHref,
  practices,
  PRACTICES_PATH,
  sectionPages,
  sectionPath,
  sections,
  SITE_NAME,
  topicHref,
  type TopicSectionId,
} from "@/practices/catalog";

import { type NavFolder, PracticeNav } from "./practice-nav";

const sectionTitle = (id: NavFolder["id"]) => sections.find((s) => s.id === id)!.title;

const FOLDERS: NavFolder[] = [
  {
    id: "react-practices",
    title: sectionTitle("react-practices"),
    href: PRACTICES_PATH,
    itemsLabel: "Practices",
    items: practices.map((p) => ({ href: practiceHref(p.slug), title: p.title, prefix: String(p.number).padStart(2, "0"), ready: p.built })),
  },
  topicFolder("browser-platform"),
  topicFolder("performance-accessibility"),
];

function topicFolder(id: TopicSectionId): NavFolder {
  return {
    id,
    title: sectionTitle(id),
    href: sectionPath(id),
    itemsLabel: "Pages",
    items: sectionPages(id).map((p) => ({ href: topicHref(p.slug), title: p.title, ready: p.written })),
  };
}

export function AppSidebar() {
  return (
    <Sidebar aria-label="Handbook navigation">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="h-auto min-h-12 py-2" render={<Link href="/" />}>
              <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <BookOpenText aria-hidden className="size-4" />
              </span>
              <span className="flex min-w-0 flex-col gap-1 leading-none">
                <span className="leading-tight font-semibold">{SITE_NAME}</span>
                <span className="text-xs text-muted-foreground">
                  {builtCount} of {practices.length} practices built
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <PracticeNav folders={FOLDERS} />
      </SidebarContent>
    </Sidebar>
  );
}
