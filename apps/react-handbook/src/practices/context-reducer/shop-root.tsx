"use client";

// Orchestration around the reducer: which sharing strategy is mounted, the
// catalog, restoring and saving the cart, cross-tab sync and checkout.
//
// The session below outlives a strategy switch (and navigation): providers
// report their latest state and their dispatch to it, a newly mounted
// provider starts from that state, and async work (checkout) dispatches
// through it, so it reaches whichever provider is mounted when it settles.

import { createContext, useContext, useEffect, useEffectEvent, useMemo } from "react";

import { useQuery } from "@/practices/data-fetching-hook/use-query";
import { toast } from "@/practices/toast-notifications/toast-store";
import { priceCart, type Product } from "@/server/practices/context-reducer/shop.schema";

import { applyAdjustments, cartsEqual, reconcile, type Cart } from "./cart";
import { parseSaved, readSaved, serialize, STORAGE_KEY, writeSaved } from "./cart-storage";
import type { Strategy } from "./render-counter";
import { CheckoutConflict, fetchProducts, postCheckout, productsKey } from "./shop-api";
import { ShopProvider, type Dispatch } from "./shop-context";
import { actions, createInitialState, isPending, presentCart, type Action, type AppState } from "./shop-reducer";

const session = {
  latest: null as AppState | null,
  dispatch: null as Dispatch | null,
  saved: null as string | null,
  storageWarned: false,
};

function dispatch(action: Action) {
  session.dispatch?.(action);
}

function getState() {
  return session.latest ?? createInitialState();
}

/**
 * Reads the current state without subscribing: for event handlers that need
 * a value at click time but shouldn't re-render when it changes.
 */
export const readShopState = getState;

function handleState(state: AppState) {
  session.latest = state;
  if (!state.hydrated) return;
  const value = serialize(presentCart(state));
  if (value === session.saved) return;
  session.saved = value;
  if (!writeSaved(value) && !session.storageWarned) {
    session.storageWarned = true;
    toast.warning("Your cart can't be saved", { description: "This browser is blocking storage. It will last for this visit." });
  }
}

function handleDispatch(next: Dispatch) {
  session.dispatch = next;
}

/** Applies a cart from storage (reload, other tab), checked against the catalog. */
function restore(raw: { cart: Cart; notes: string[] } | null, products: ReadonlyMap<string, Product> | null) {
  const saved = raw ?? { cart: presentCart(getState()), notes: [] };
  if (!products) return saved;
  const checked = reconcile(saved.cart, products);
  return { cart: checked.cart, notes: [...saved.notes, ...checked.notes] };
}

export type Catalog = {
  products: Product[] | undefined;
  byId: ReadonlyMap<string, Product> | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => void;
};

const CatalogContext = createContext<Catalog | null>(null);

/** Server data from the shared query cache: separate from the reducer. */
export function useCatalog() {
  const catalog = useContext(CatalogContext);
  if (!catalog) throw new Error("useCatalog must be used inside <ShopRoot>");
  return catalog;
}

export function ShopRoot({ strategy, children }: { strategy: Strategy; children: React.ReactNode }) {
  const query = useQuery(productsKey, fetchProducts);
  const products = query.data;
  const byId = useMemo(() => (products ? new Map(products.map((p) => [p.id, p])) : null), [products]);
  const settled = query.status !== "loading";
  const catalog = useMemo<Catalog>(
    () => ({
      products,
      byId,
      error: query.error?.message ?? null,
      isLoading: query.isLoading,
      refetch: query.refetch,
    }),
    [products, byId, query.error, query.isLoading, query.refetch],
  );

  // Restore the saved cart once the catalog is known, so stock and
  // products can be checked. Returning to the practice re-checks storage.
  const hydrate = useEffectEvent(() => {
    const state = getState();
    const raw = readSaved();
    if (!state.hydrated) {
      const { cart, notes } = restore(raw, byId);
      // Saved again (as v2) once applied, if migration or checks changed it.
      session.saved = null;
      dispatch(actions.hydrated(cart, notes));
      if (products) dispatch(actions.catalogLoaded(products.length));
      return;
    }
    if (raw && !cartsEqual(raw.cart, presentCart(state))) dispatch(actions.synced(restore(raw, byId).cart));
  });

  useEffect(() => {
    if (settled) hydrate();
  }, [settled]);

  // The catalog arrived after the cart was restored without it (Retry
  // after an error): check the restored lines now.
  const catalogArrived = useEffectEvent(() => {
    const state = getState();
    if (!state.hydrated || !byId) return;
    const { cart, notes } = reconcile(presentCart(state), byId);
    if (!cartsEqual(cart, presentCart(state))) dispatch(actions.hydrated(cart, notes));
  });

  useEffect(() => {
    if (byId) catalogArrived();
  }, [byId]);

  // Another tab saved a different cart: show it here too.
  const sync = useEffectEvent((event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !getState().hydrated) return;
    const raw = parseSaved(event.newValue);
    const { cart } = restore(raw ?? { cart: { lines: [], discount: null }, notes: [] }, byId);
    if (cartsEqual(cart, presentCart(getState()))) return;
    session.saved = event.newValue;
    dispatch(actions.synced(cart));
  });

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => sync(event);
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <CatalogContext value={catalog}>
      <ShopProvider key={strategy} strategy={strategy} initial={getState} onState={handleState} onDispatch={handleDispatch}>
        {children}
      </ShopProvider>
    </CatalogContext>
  );
}

/** Places the order: optimistic start, then success or rollback. */
export async function placeOrder(byId: ReadonlyMap<string, Product>) {
  const state = getState();
  const cart = presentCart(state);
  if (isPending(state) || cart.lines.length === 0) return;
  const lines = cart.lines.map((l) => ({ productId: l.productId, qty: l.qty, unitPrice: byId.get(l.productId)?.price ?? 0 }));
  const totals = priceCart(lines.map((l) => ({ qty: l.qty, price: l.unitPrice })), cart.discount);
  dispatch(actions.checkoutStarted());
  try {
    const order = await postCheckout({ lines, discount: cart.discount, expectedTotal: totals.total });
    dispatch(actions.checkoutSucceeded(order));
    toast.success(`Order ${order.orderId} placed`);
  } catch (error) {
    if (error instanceof CheckoutConflict) {
      dispatch(actions.checkoutFailed(error.message, error.adjustments, applyAdjustments(cart, error.adjustments)));
    } else {
      dispatch(actions.checkoutFailed(error instanceof Error ? error.message : String(error), [], null));
    }
  }
}

/** Demo helper: write a raw value as if an older app version saved it, then restore. */
export function loadRawSave(value: string, byId: ReadonlyMap<string, Product> | null) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    toast.error("This browser is blocking storage");
    return;
  }
  const { cart, notes } = restore(parseSaved(value), byId);
  session.saved = null;
  dispatch(actions.hydrated(cart, notes));
}
