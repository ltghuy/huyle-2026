"use client";

import { Loader2, Minus, PackageCheck, Plus, RotateCcw, Trash2, TriangleAlert, X } from "lucide-react";
import { memo, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { confirm } from "@/practices/accessible-modal/modal-store";
import {
  checkDiscount,
  DISCOUNT_LABELS,
  formatMoney,
  priceCart,
} from "@/server/practices/context-reducer/shop.schema";

import { itemCount, qtyOf } from "./cart";
import { RENDER_ROOT, RenderBadge, useRenderCount } from "./render-counter";
import { shallowEqual, useShopDispatch, useShopSelector } from "./shop-context";
import { actions, isPending, visibleCart, type AppState } from "./shop-reducer";
import { placeOrder, readShopState, useCatalog } from "./shop-root";

const lineIds = (s: AppState) => visibleCart(s).lines.map((l) => l.productId);
const selectHydrated = (s: AppState) => s.hydrated;
const selectCart = (s: AppState) => visibleCart(s);
const selectDiscount = (s: AppState) => visibleCart(s).discount;
const selectCheckout = (s: AppState) => s.checkout;
const selectNotice = (s: AppState) => s.notice;
const selectHasItems = (s: AppState) => visibleCart(s).lines.length > 0;

/** Static layout: reads no state, so it never re-renders on actions. */
export function CartPanel() {
  return (
    <section aria-labelledby="cart-heading" className="flex flex-col gap-4 rounded-lg border p-4 lg:sticky lg:top-4">
      <h3 id="cart-heading" className="font-medium">
        Cart
      </h3>
      <Notice />
      <CartLines />
      <DiscountForm />
      <Totals />
      <CheckoutBox />
    </section>
  );
}

function Notice() {
  const notice = useShopSelector(selectNotice);
  const dispatch = useShopDispatch();
  if (!notice) return null;
  return (
    <div role="status" className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-sm">
      <p className="flex-1">{notice}</p>
      <Button variant="ghost" size="icon-xs" aria-label="Dismiss" onClick={() => dispatch(actions.dismissNotice())}>
        <X aria-hidden />
      </Button>
    </div>
  );
}

function CartLines() {
  const badge = useRenderCount("Cart list");
  const ids = useShopSelector(lineIds, shallowEqual);
  const hydrated = useShopSelector(selectHydrated);

  return (
    <div data-render-root className={cn("flex flex-col gap-2 p-1", RENDER_ROOT)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/75">Lines</span>
        <RenderBadge badgeRef={badge} label="Cart list" />
      </div>
      {!hydrated ? (
        <div aria-busy="true" aria-label="Restoring your cart" className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : ids.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-center text-foreground/75">Your cart is empty.</p>
      ) : (
        <>
          <ul aria-label="Cart lines" className="flex flex-col divide-y rounded-md border">
            {ids.map((id) => (
              <CartLine key={id} productId={id} />
            ))}
          </ul>
          <ClearCartButton />
        </>
      )}
    </div>
  );
}

const CartLine = memo(function CartLine({ productId }: { productId: string }) {
  const { byId } = useCatalog();
  const product = byId?.get(productId);
  const name = product?.name ?? "Unavailable product";
  const badge = useRenderCount(`Line: ${name}`);
  const qty = useShopSelector((s) => qtyOf(visibleCart(s), productId));
  const pending = useShopSelector(isPending);
  const dispatch = useShopDispatch();
  const [draft, setDraft] = useState<string | null>(null);
  const inputId = useId();
  const stock = product?.stock ?? qty;

  function commitDraft() {
    if (draft === null) return;
    const value = Number(draft);
    // Empty, zero, negative or not a number: revert to the last valid qty.
    if (draft.trim() !== "" && Number.isFinite(value) && value >= 1) dispatch(actions.setQty(productId, value, stock));
    setDraft(null);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") commitDraft();
    if (event.key === "Escape") setDraft(null);
  }

  return (
    <li data-render-root className={cn("flex flex-col gap-2 p-2", RENDER_ROOT, "rounded-md -outline-offset-2")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{name}</p>
          <p className="text-xs text-foreground/75 tabular-nums">
            {product ? `${formatMoney(product.price)} · line ${formatMoney(product.price * qty)}` : "Unavailable until the catalog loads"}
          </p>
        </div>
        <RenderBadge badgeRef={badge} label={`Line ${name}`} />
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" aria-label={`Decrease quantity of ${name}`} disabled={pending || qty <= 1} onClick={() => dispatch(actions.setQty(productId, qty - 1, stock))}>
          <Minus aria-hidden />
        </Button>
        <label htmlFor={inputId} className="sr-only">
          Quantity of {name}
        </label>
        <Input
          id={inputId}
          inputMode="numeric"
          value={draft ?? String(qty)}
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={handleKeyDown}
          className="h-7 w-12 text-center tabular-nums"
        />
        <Button variant="outline" size="icon-sm" aria-label={`Increase quantity of ${name}`} disabled={pending || qty >= stock} onClick={() => dispatch(actions.setQty(productId, qty + 1, stock))}>
          <Plus aria-hidden />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`Remove ${name}`} disabled={pending} onClick={() => dispatch(actions.remove(productId))} className="ml-auto">
          <Trash2 aria-hidden />
        </Button>
      </div>
    </li>
  );
});

/** Dispatch-only, no props: memo keeps it out of the list's re-renders. */
const ClearCartButton = memo(function ClearCartButton() {
  const badge = useRenderCount("Clear cart");
  const dispatch = useShopDispatch();

  async function clearAfterConfirm() {
    const ok = await confirm({
      title: "Clear the cart?",
      description: "You can undo this with Undo or Ctrl+Z.",
      confirmLabel: "Clear cart",
      destructive: true,
    });
    if (ok) dispatch(actions.clear());
  }

  function handleClear() {
    void clearAfterConfirm();
  }

  return (
    <div data-render-root className={cn("flex items-center justify-between", RENDER_ROOT)}>
      <Button variant="ghost" size="sm" onClick={handleClear}>
        <Trash2 aria-hidden /> Clear cart
      </Button>
      <RenderBadge badgeRef={badge} label="Clear cart" />
    </div>
  );
});

function DiscountForm() {
  const badge = useRenderCount("Discount form");
  const discount = useShopSelector(selectDiscount);
  const pending = useShopSelector(isPending);
  const dispatch = useShopDispatch();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ids = { input: useId(), error: useId() };

  function handleApply(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    // Read the item count now instead of subscribing to it: this form
    // doesn't need to re-render every time a quantity changes.
    const check = checkDiscount(code, itemCount(visibleCart(readShopState())));
    if (!check.ok) {
      setError(check.reason);
      return;
    }
    dispatch(actions.applyDiscount(check.code));
    setCode("");
    setError(null);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setCode(event.target.value);
    setError(null);
  }

  return (
    <div data-render-root className={cn("flex flex-col gap-2 p-1", RENDER_ROOT)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/75">Discount</span>
        <RenderBadge badgeRef={badge} label="Discount form" />
      </div>
      {discount ? (
        <div className="flex items-center justify-between gap-2 rounded-md border p-2">
          <span>
            <span className="font-mono font-medium">{discount}</span>{" "}
            <span className="text-foreground/75">· {DISCOUNT_LABELS[discount]}</span>
          </span>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => dispatch(actions.removeDiscount())}>
            Remove
          </Button>
        </div>
      ) : (
        <form onSubmit={handleApply} noValidate className="flex flex-col gap-1">
          <label htmlFor={ids.input} className="sr-only">
            Discount code
          </label>
          <div className="flex gap-2">
            <Input
              id={ids.input}
              value={code}
              onChange={handleChange}
              placeholder="Code, e.g. SAVE10"
              autoComplete="off"
              disabled={pending}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? ids.error : undefined}
            />
            <Button type="submit" variant="outline" disabled={pending || code.trim() === ""}>
              Apply
            </Button>
          </div>
          {error ? (
            <p id={ids.error} className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}

function Totals() {
  const badge = useRenderCount("Totals");
  const cart = useShopSelector(selectCart);
  const { byId } = useCatalog();
  const priced = cart.lines.flatMap((l) => {
    const product = byId?.get(l.productId);
    return product ? [{ qty: l.qty, price: product.price }] : [];
  });
  const t = priceCart(priced, cart.discount);
  const rows: [string, string][] = [
    ["Items", String(t.items)],
    ["Subtotal", formatMoney(t.subtotal)],
    ["Discount", t.discount ? `−${formatMoney(t.discount)}` : formatMoney(0)],
    ["Shipping", t.items === 0 ? "—" : t.shipping === 0 ? "Free" : formatMoney(t.shipping)],
  ];

  return (
    <div data-render-root className={cn("flex flex-col gap-1 p-1", RENDER_ROOT)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/75">Totals</span>
        <RenderBadge badgeRef={badge} label="Totals" />
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 tabular-nums">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-foreground/75">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
        <dt className="border-t pt-1 font-medium">Total</dt>
        <dd className="border-t pt-1 text-right font-medium">{formatMoney(t.total)}</dd>
      </dl>
    </div>
  );
}

function CheckoutBox() {
  const badge = useRenderCount("Checkout");
  const checkout = useShopSelector(selectCheckout);
  const hasItems = useShopSelector(selectHasItems);
  const { byId } = useCatalog();
  const pending = checkout.status === "pending";

  function handleCheckout() {
    if (byId) void placeOrder(byId);
  }

  return (
    <div data-render-root className={cn("flex flex-col gap-2 p-1", RENDER_ROOT)}>
      <div className="flex items-center justify-between gap-2">
        <Button className="flex-1" disabled={!hasItems || pending || !byId} onClick={handleCheckout}>
          {pending ? <Loader2 aria-hidden className="animate-spin motion-reduce:animate-none" /> : null}
          {pending ? "Placing order…" : "Checkout"}
        </Button>
        <RenderBadge badgeRef={badge} label="Checkout" />
      </div>
      <div role="status" className="text-sm">
        {checkout.status === "succeeded" ? (
          <p className="flex items-center gap-2 rounded-md border p-2">
            <PackageCheck aria-hidden className="size-4 text-success" />
            Order <span className="font-mono">{checkout.order.orderId}</span> placed · {formatMoney(checkout.order.total)}
          </p>
        ) : checkout.status === "failed" ? (
          <div className="flex flex-col gap-2 rounded-md border border-destructive/40 p-2">
            <p className="flex items-center gap-2 font-medium">
              <TriangleAlert aria-hidden className="size-4 text-destructive" /> {checkout.message}
            </p>
            {checkout.adjustments.length > 0 ? (
              <ul className="text-xs text-foreground/75">
                {checkout.adjustments.map((a) => (
                  <li key={a.productId}>
                    {byId?.get(a.productId)?.name ?? a.productId}:{" "}
                    {a.kind === "stock" ? (a.value < 1 ? "sold out, removed" : `only ${a.value} available`) : `price is now ${formatMoney(a.value)}`}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-foreground/75">Your cart was restored.</p>
            )}
            <Button variant="outline" size="sm" className="self-start" disabled={!hasItems || !byId} onClick={handleCheckout}>
              <RotateCcw aria-hidden /> Retry
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
