import { SearchX } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3 py-10">
      <SearchX aria-hidden className="size-6 text-muted-foreground" />
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">
        There&apos;s nothing at this address. It may have moved, or the link is mistyped.
      </p>
      <Button variant="outline" render={<Link href="/" />}>
        Back to home
      </Button>
    </div>
  );
}
