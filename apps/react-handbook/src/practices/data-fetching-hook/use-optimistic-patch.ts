"use client";

import { useCallback, useRef, useState } from "react";

import type {
  PatchUser,
  UserDetail,
  UserSummary,
} from "@/server/practices/data-fetching-hook/users.schema";
import { toast } from "@/practices/toast-notifications/toast-store";

import { queryClient } from "./query-client";
import { isUserKey, isUsersKey, patchUser, userKey, usersKey } from "./users-api";

type Field = keyof PatchUser;

/** Restores only the fields that still hold this edit's value. */
function revert<T extends UserSummary>(current: T, patch: PatchUser, previous: Partial<T>): T {
  let next = current;
  for (const field of Object.keys(patch) as Field[]) {
    if (current[field] === patch[field] && field in previous) {
      next = { ...next, [field]: previous[field] };
    }
  }
  return next;
}

function pick<T extends object>(source: T | undefined, fields: Field[]): Partial<T> {
  if (!source) return {};
  return Object.fromEntries(
    fields.filter((f) => f in source).map((f) => [f, source[f as keyof T]]),
  ) as Partial<T>;
}

/**
 * Optimistic, field-level edits for users: update list + detail now, roll
 * back only this edit's fields on failure, then sync with the server.
 */
export function useOptimisticPatch() {
  const [pending, setPending] = useState<Record<string, Field[]>>({});
  // Edits in flight per user; the last one to settle refreshes from the server.
  const inFlight = useRef(new Map<string, number>());

  const mutate = useCallback(async (id: string, patch: PatchUser) => {
    const fields = Object.keys(patch) as Field[];
    const matches = (key: readonly unknown[]) => isUsersKey(key) || isUserKey(id)(key);

    // A refresh already running would overwrite the optimistic value.
    queryClient.cancelQueries(matches);

    const list = queryClient.getQueryData<UserSummary[]>(usersKey);
    const previousSummary = pick(list?.find((u) => u.id === id), fields);
    const previousDetail = pick(queryClient.getQueryData<UserDetail>(userKey(id)), fields);

    queryClient.setQueryData<UserSummary[]>(usersKey, (users) =>
      users?.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    );
    queryClient.setQueryData<UserDetail>(userKey(id), (user) =>
      user ? { ...user, ...patch } : undefined,
    );

    inFlight.current.set(id, (inFlight.current.get(id) ?? 0) + 1);
    setPending((p) => ({ ...p, [id]: [...(p[id] ?? []), ...fields] }));

    try {
      await patchUser(id, patch);
    } catch (error) {
      queryClient.setQueryData<UserSummary[]>(usersKey, (users) =>
        users?.map((u) => (u.id === id ? revert(u, patch, previousSummary) : u)),
      );
      queryClient.setQueryData<UserDetail>(userKey(id), (user) =>
        user ? revert(user, patch, previousDetail) : undefined,
      );
      toast.error("Couldn't save the change", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setPending((p) => {
        const rest = [...(p[id] ?? [])];
        for (const f of fields) rest.splice(rest.indexOf(f), 1);
        return { ...p, [id]: rest };
      });
      const remaining = (inFlight.current.get(id) ?? 1) - 1;
      inFlight.current.set(id, remaining);
      if (remaining === 0) queryClient.invalidateQueries(matches);
    }
  }, []);

  const isPending = useCallback(
    (id: string, field: Field) => pending[id]?.includes(field) ?? false,
    [pending],
  );

  return { mutate, isPending };
}
