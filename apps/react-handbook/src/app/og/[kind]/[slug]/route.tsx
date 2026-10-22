import { ImageResponse } from "next/og";

import { CardLayout } from "@/lib/card-layout";
import { CARDS, findCard } from "@/lib/cards";
import { CARD_SIZE } from "@/lib/social";

// One card image per indexable page, built at build time.

export function generateStaticParams() {
  return CARDS.map((c) => ({ kind: c.kind, slug: c.slug }));
}

export const dynamicParams = false;

export async function GET(_request: Request, { params }: RouteContext<"/og/[kind]/[slug]">) {
  const { kind, slug } = await params;
  const card = findCard(kind, slug);
  if (!card) return new Response("Not found", { status: 404 });
  return new ImageResponse(<CardLayout card={card} />, CARD_SIZE);
}
