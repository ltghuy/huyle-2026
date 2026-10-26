"use client";

import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";

/**
 * A React root of its own on a container this hook owns, for demos that
 * observe a real tree without touching the page's tree.
 *
 * Unmounting is deferred (unmounting synchronously during a render warns), and
 * a remount that comes before it, as Strict Mode does in development (mount,
 * clean up, mount again), cancels it and keeps the same root: calling
 * createRoot twice on one container is an error.
 */
export function useOwnedRoot() {
  const container = useRef<HTMLDivElement>(null);
  const root = useRef<Root | null>(null);
  const pendingUnmount = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    if (pendingUnmount.current) {
      clearTimeout(pendingUnmount.current);
      pendingUnmount.current = null;
    }
    root.current ??= createRoot(el);
    const owned = root.current;
    return () => {
      pendingUnmount.current = setTimeout(() => {
        pendingUnmount.current = null;
        owned.unmount();
        if (root.current === owned) root.current = null;
      });
    };
  }, []);

  return { container, root };
}

/** Mounts `node` in an owned root and re-renders it when `node` changes. */
export function useIsolatedRoot(node: React.ReactNode) {
  const { container, root } = useOwnedRoot();

  useEffect(() => {
    root.current?.render(node);
  }, [node, root]);

  return container;
}
