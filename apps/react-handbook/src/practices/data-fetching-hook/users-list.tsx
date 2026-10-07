"use client";

import { Loader2, Star, TriangleAlert } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { UserSummary } from "@/server/practices/data-fetching-hook/users.schema";

import { queryClient } from "./query-client";
import type { useOptimisticPatch } from "./use-optimistic-patch";
import { useQuery } from "./use-query";
import { fetchUser, fetchUsers, userKey, usersKey } from "./users-api";

const PREFETCH_DELAY_MS = 150;

type Mutation = ReturnType<typeof useOptimisticPatch>;

function prefetchUser(id: string) {
  queryClient.prefetchQuery(userKey(id), fetchUser(id));
}

export function UsersList({
  selectedId,
  onSelect,
  mutation,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  mutation: Mutation;
}) {
  const users = useQuery(usersKey, fetchUsers);

  return (
    <section aria-labelledby="users-heading" className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 id="users-heading" className="text-sm font-semibold">
          Users
        </h3>
        {users.isFetching && users.data ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 aria-hidden className="size-3 animate-spin motion-reduce:animate-none" />
            Refreshing
          </span>
        ) : null}
      </div>

      {users.isLoading ? (
        <div aria-busy="true" aria-label="Loading users" className="flex flex-col gap-2">
          {users.attempt > 1 ? (
            <p className="text-xs text-muted-foreground">Retrying (attempt {users.attempt})…</p>
          ) : null}
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : !users.data ? (
        <div role="alert" className="flex flex-col items-start gap-2 rounded-lg bg-destructive/5 p-3 text-sm">
          <span className="flex items-center gap-2 text-destructive">
            <TriangleAlert aria-hidden className="size-4" /> {users.error?.message}
          </span>
          <Button size="sm" variant="outline" onClick={users.refetch}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          {users.error ? (
            <p role="status" className="text-xs text-destructive">
              Refresh failed: {users.error.message}. Showing cached data.
            </p>
          ) : null}
          <ul className="flex max-h-[26rem] flex-col overflow-y-auto rounded-lg border">
            {users.data.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                selected={user.id === selectedId}
                onSelect={onSelect}
                mutation={mutation}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function UserRow({
  user,
  selected,
  onSelect,
  mutation,
}: {
  user: UserSummary;
  selected: boolean;
  onSelect: (id: string) => void;
  mutation: Mutation;
}) {
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = mutation.isPending(user.id, "favorite");

  function handlePointerEnter() {
    hoverTimer.current = setTimeout(() => prefetchUser(user.id), PREFETCH_DELAY_MS);
  }

  function handlePointerLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }

  function handleToggleFavorite() {
    void mutation.mutate(user.id, { favorite: !user.favorite });
  }

  return (
    <li className={cn("flex items-center border-b last:border-b-0", selected && "bg-accent")}>
      <button
        type="button"
        aria-current={selected ? "true" : undefined}
        onClick={() => onSelect(user.id)}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onFocus={() => prefetchUser(user.id)}
        className="flex min-w-0 flex-1 flex-col px-3 py-2 text-left text-sm outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/60"
      >
        <span className="truncate font-medium">{user.name}</span>
        <span className="text-xs text-foreground/70">{user.role}</span>
      </button>
      <Button
        size="icon-sm"
        variant="ghost"
        className="mr-2 shrink-0"
        aria-pressed={user.favorite}
        aria-label={`${user.favorite ? "Remove" : "Mark"} ${user.name} as favorite`}
        disabled={saving}
        onClick={handleToggleFavorite}
      >
        <Star aria-hidden className={cn(user.favorite && "fill-warning text-warning")} />
      </Button>
    </li>
  );
}
