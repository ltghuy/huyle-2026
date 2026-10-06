import { Hammer } from "lucide-react";

export function PracticePlaceholder({ featureId }: { featureId: string }) {
  return (
    <section
      aria-label="Live demo"
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center"
    >
      <Hammer aria-hidden className="size-6 text-muted-foreground" />
      <p className="font-medium">Coming soon</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        This practice hasn&apos;t been built yet. It&apos;s planned as feature{" "}
        <span className="font-mono">{featureId}</span>.
      </p>
    </section>
  );
}
