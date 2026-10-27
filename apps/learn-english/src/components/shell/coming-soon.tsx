import { Construction } from "lucide-react";

/** Placeholder body for pages whose feature isn't built yet. */
export function ComingSoon() {
  return (
    <div className="mx-4 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center md:mx-8">
      <Construction className="size-8 text-muted-foreground" aria-hidden />
      <p className="text-muted-foreground">Phần này đang được xây dựng.</p>
    </div>
  );
}
