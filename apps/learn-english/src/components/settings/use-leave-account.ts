"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SESSION_QUERY_KEY } from "@/hooks/use-account";
import { clearDevice } from "@/storage/replace";

/** After signing out or deleting the account: clear this device, re-read the session, confirm. */
export function useLeaveAccount() {
  const queryClient = useQueryClient();
  return async function leaveAccount(message: string) {
    await clearDevice(Date.now());
    await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    toast.success(message);
  };
}
