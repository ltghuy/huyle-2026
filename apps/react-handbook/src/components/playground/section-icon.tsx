import { Atom, Cog, FlaskConical, Gauge, Globe, Network, ScanSearch, ShieldCheck, type LucideIcon } from "lucide-react";

import type { SectionId } from "@/practices/catalog";

const ICONS: Record<SectionId, LucideIcon> = {
  "react-practices": Atom,
  "browser-platform": Globe,
  "performance-accessibility": Gauge,
  security: ShieldCheck,
  "system-design": Network,
  "under-the-hood": Cog,
  testing: FlaskConical,
  seo: ScanSearch,
};

export function SectionIcon({ id, className }: { id: SectionId; className?: string }) {
  const Icon = ICONS[id];
  return <Icon aria-hidden className={className} />;
}
