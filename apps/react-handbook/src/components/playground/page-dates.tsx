import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";

// UTC so the stored calendar date renders the same on the server and in every time zone.
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

type Dates = { created: string; updated: string };

/** "Updated {date}", or "Created {date}" if the page hasn't changed since. */
function PageDate({ created, updated }: Dates) {
  const changed = updated !== created;
  const iso = changed ? updated : created;
  return (
    <span>
      {changed ? "Updated" : "Created"} <time dateTime={iso}>{DATE_FORMAT.format(new Date(iso))}</time>
    </span>
  );
}

/** A page header's date: when it was last updated, or when it was created if it hasn't changed since. */
export function PageDates(dates: Dates) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-success">
      <CalendarDays aria-hidden className="size-3" />
      <PageDate {...dates} />
    </p>
  );
}

/** The same date as a pill, for index cards. */
export function DateBadge({ className, ...dates }: Dates & { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success",
        className,
      )}
    >
      <CalendarDays aria-hidden className="size-3" />
      <PageDate {...dates} />
    </span>
  );
}
