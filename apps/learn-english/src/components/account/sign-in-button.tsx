"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signInWithGoogle, SignInUnavailableError } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export const SIGN_IN_LABEL = "Đăng nhập với Google";
const SIGN_IN_FAILED = "Chưa đăng nhập được. Bạn kiểm tra mạng rồi thử lại nhé.";
const SIGN_IN_UNAVAILABLE = "Đăng nhập đang tạm thời gián đoạn. Bạn thử lại sau ít phút nhé.";

/** The page to come back to: here, without a leftover sign-in error. Read at click time, so static pages need no Suspense. */
export function returnPath(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete("error");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Google's "G", in its own colours. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

/**
 * Signs in with Google and comes back to this page (feature 022, AC-002, AC-012). While Google's
 * page loads, the button stays busy so a second tap doesn't start another round trip.
 */
export function SignInButton({ className, size = "lg", label = SIGN_IN_LABEL }: { className?: string; size?: "sm" | "lg"; label?: string }) {
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);
    try {
      await signInWithGoogle(returnPath(window.location.pathname, window.location.search));
    } catch (error) {
      setBusy(false);
      toast.error(error instanceof SignInUnavailableError ? SIGN_IN_UNAVAILABLE : SIGN_IN_FAILED);
    }
  }

  return (
    <Button type="button" variant="outline" size={size} disabled={busy} onClick={handleSignIn} className={cn(size === "lg" && "h-11 px-4", "gap-2", className)}>
      <GoogleMark />
      {label}
    </Button>
  );
}
