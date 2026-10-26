import { Button } from "@/components/ui/button";

/** A failed fetch in a live demo, with a retry. */
export function FetchError({ what, message, onRetry }: { what: string; message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 p-3 text-sm">
      <p>
        Couldn&apos;t fetch {what}: {message}
      </p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
