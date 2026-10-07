"use client";

import { ShoppingCart } from "lucide-react";

import { itemCount } from "./cart";
import { RENDER_ROOT, RenderBadge, useRenderCount } from "./render-counter";
import { useShopSelector } from "./shop-context";
import { visibleCart, type AppState } from "./shop-reducer";

const selectCount = (s: AppState) => itemCount(visibleCart(s));

export function ShopHeader() {
  const badge = useRenderCount("Header badge");
  const count = useShopSelector(selectCount);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
      <span className="font-medium">Practice shop</span>
      <div data-render-root className={`flex items-center gap-3 p-1 ${RENDER_ROOT}`}>
        <span className="inline-flex items-center gap-2">
          <ShoppingCart aria-hidden className="size-4" />
          <span className="tabular-nums" aria-live="polite">
            {count} {count === 1 ? "item" : "items"}
          </span>
        </span>
        <RenderBadge badgeRef={badge} label="Header badge" />
      </div>
    </div>
  );
}
