"use client";

import { useEffect, useState } from "react";
import type { StoredClaim } from "@/learning/types";
import { checkClaims, dismissRejected, flushClaims, rejectedClaims } from "@/claims/claims-client";
import { ClaimsNotice } from "./claims-notice";

/** Resends unsent claims, asks about pending ones (at most once a day) and shows rejections once (feature 016). */
export function ClaimsRunner() {
  const [rejected, setRejected] = useState<StoredClaim[]>([]);

  useEffect(() => {
    let active = true;
    async function run() {
      await flushClaims();
      await checkClaims();
      const claims = await rejectedClaims();
      if (active) setRejected(claims);
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void run();
    }
    void run();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  function handleDismiss() {
    void dismissRejected(rejected);
    setRejected([]);
  }

  return <ClaimsNotice claims={rejected} onDismiss={handleDismiss} />;
}
