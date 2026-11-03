import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** "Minh Anh Nguyen" → "MA"; "?" when there is no name. */
export function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}

/**
 * The learner's Google picture (feature 022, AC-002, AC-022), or their initials when there is none
 * or it can't load. Google's image host refuses requests that send a referrer, so none is sent.
 */
export function AccountAvatar({ name, image, className }: { name: string; image: string | null; className?: string }) {
  return (
    <Avatar className={cn("size-full", className)} aria-hidden>
      {image ? <AvatarImage src={image} alt="" referrerPolicy="no-referrer" /> : null}
      <AvatarFallback className="bg-primary/15 font-semibold text-primary">{initialsOf(name)}</AvatarFallback>
    </Avatar>
  );
}
