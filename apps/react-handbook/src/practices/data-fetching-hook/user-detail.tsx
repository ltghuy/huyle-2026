"use client";

import { Loader2, Star, TriangleAlert, UserX } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { HttpError } from "./query-client";
import type { useOptimisticPatch } from "./use-optimistic-patch";
import { useQuery } from "./use-query";
import { fetchUser, userKey } from "./users-api";

type Mutation = ReturnType<typeof useOptimisticPatch>;

export function UserDetail({
  id,
  title,
  mutation,
}: {
  id: string;
  title: string;
  mutation: Mutation;
}) {
  const user = useQuery(userKey(id), fetchUser(id));
  const notFound = user.error instanceof HttpError && user.error.status === 404;

  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {user.isFetching && user.data ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 aria-hidden className="size-3 animate-spin motion-reduce:animate-none" />
            Refreshing
          </span>
        ) : null}
      </div>

      {user.isLoading ? (
        <div aria-busy="true" aria-label="Loading user" className="flex flex-col gap-2">
          {user.attempt > 1 ? (
            <p className="text-xs text-muted-foreground">Retrying (attempt {user.attempt})…</p>
          ) : null}
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : notFound ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserX aria-hidden className="size-4" /> User not found. It may have been deleted.
        </p>
      ) : !user.data ? (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm">
          <span className="flex items-center gap-2 text-destructive">
            <TriangleAlert aria-hidden className="size-4" /> {user.error?.message}
          </span>
          <Button size="sm" variant="outline" onClick={user.refetch}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          {user.error ? (
            <p role="status" className="text-xs text-destructive">
              Refresh failed: {user.error.message}. Showing cached data.
            </p>
          ) : null}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{user.data.name}</p>
              <p className="text-sm text-foreground/70">
                {user.data.role} · {user.data.email}
              </p>
            </div>
            <FavoriteButton
              id={id}
              name={user.data.name}
              favorite={user.data.favorite}
              mutation={mutation}
            />
          </div>
          <p className="text-sm">{user.data.bio}</p>
          <RenameForm key={id} id={id} name={user.data.name} mutation={mutation} />
        </>
      )}
    </section>
  );
}

function FavoriteButton({
  id,
  name,
  favorite,
  mutation,
}: {
  id: string;
  name: string;
  favorite: boolean;
  mutation: Mutation;
}) {
  function handleToggle() {
    void mutation.mutate(id, { favorite: !favorite });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      aria-pressed={favorite}
      aria-label={`${favorite ? "Remove" : "Mark"} ${name} as favorite`}
      disabled={mutation.isPending(id, "favorite")}
      onClick={handleToggle}
    >
      <Star aria-hidden className={cn(favorite && "fill-warning text-warning")} />
      {favorite ? "Favorite" : "Not favorite"}
    </Button>
  );
}

function RenameForm({ id, name, mutation }: { id: string; name: string; mutation: Mutation }) {
  const [draft, setDraft] = useState(name);
  const saving = mutation.isPending(id, "name");
  const inputId = `rename-${id}`;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draft.trim();
    if (value) void mutation.mutate(id, { name: value });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
        Display name
      </label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={draft}
          maxLength={60}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={saving || !draft.trim()}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
