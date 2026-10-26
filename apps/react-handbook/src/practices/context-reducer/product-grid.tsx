"use client";

import { Plus, TriangleAlert } from "lucide-react";
import { memo } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatMoney, type Product } from "@/server/practices/context-reducer/shop.schema";

import { qtyOf } from "./cart";
import { RENDER_ROOT, RenderBadge, useRenderCount } from "./render-counter";
import { useShopDispatch, useShopSelector } from "./shop-context";
import { actions, isPending, visibleCart } from "./shop-reducer";
import { useCatalog } from "./shop-root";

// Product swatches are catalog data, not UI chrome.
export const SWATCH: Record<Product["color"], string> = {
  blue: "bg-blue-500", green: "bg-green-500", amber: "bg-amber-400", rose: "bg-rose-500",
  violet: "bg-violet-500", slate: "bg-slate-500", teal: "bg-teal-500", orange: "bg-orange-500",
};

export function ProductGrid() {
  const { products, error, refetch } = useCatalog();

  if (error && !products) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border p-4">
        <p className="flex items-center gap-2 font-medium text-destructive">
          <TriangleAlert aria-hidden className="size-4" /> Couldn&apos;t load the catalog
        </p>
        <p className="text-foreground/75">{error}</p>
        <Button variant="outline" size="sm" onClick={refetch}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <ul aria-label="Products" aria-busy={!products} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {products
        ? products.map((product) => <ProductCard key={product.id} product={product} />)
        : Array.from({ length: 12 }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-24 w-full" />
            </li>
          ))}
    </ul>
  );
}

const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  const badge = useRenderCount(`Card: ${product.name}`);
  const qty = useShopSelector((s) => qtyOf(visibleCart(s), product.id));
  const pending = useShopSelector(isPending);
  const soldOut = qty >= product.stock;

  return (
    <li data-render-root className={cn("flex flex-col gap-1.5 border p-2.5", RENDER_ROOT)}>
      <div className="flex items-center gap-2">
        <span aria-hidden className={cn("size-4 shrink-0 rounded-sm", SWATCH[product.color])} />
        <h3 className="min-w-0 flex-1 truncate font-medium" title={product.name}>
          {product.name}
        </h3>
        <RenderBadge badgeRef={badge} label={product.name} />
      </div>
      <p className="flex items-baseline justify-between gap-2 text-xs tabular-nums">
        <span className="text-sm">{formatMoney(product.price)}</span>
        <span className="text-foreground/75">
          {qty > 0 ? `In cart: ${qty}` : `${product.stock} in stock`}
          {soldOut ? " (max)" : ""}
        </span>
      </p>
      <AddButton productId={product.id} name={product.name} stock={product.stock} disabled={soldOut || pending} />
    </li>
  );
});

/**
 * Only dispatches. With split contexts or selectors it never re-renders on
 * state changes (its props only change when it becomes disabled).
 */
const AddButton = memo(function AddButton({
  productId, name, stock, disabled,
}: {
  productId: string;
  name: string;
  stock: number;
  disabled: boolean;
}) {
  const badge = useRenderCount(`Add: ${name}`);
  const dispatch = useShopDispatch();

  return (
    <div data-render-root className={cn("mt-auto flex items-center justify-between gap-2", RENDER_ROOT)}>
      <Button size="sm" variant="outline" disabled={disabled} aria-label={`Add ${name} to cart`} onClick={() => dispatch(actions.add(productId, stock))}>
        <Plus aria-hidden /> Add
      </Button>
      <RenderBadge badgeRef={badge} label={`Add ${name}`} />
    </div>
  );
});
