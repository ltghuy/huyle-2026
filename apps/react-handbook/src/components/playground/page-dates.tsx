import { CalendarDays } from "lucide-react";

// UTC so the stored calendar date renders the same on the server and in every time zone.
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

/** A page header's date: when it was last updated, or when it was created if it hasn't changed since. */
export function PageDates({ created, updated }: { created: string; updated: string }) {
  const changed = updated !== created;
  const iso = changed ? updated : created;
  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-success">
      <CalendarDays aria-hidden className="size-3" />
      <span>
        {changed ? "Updated" : "Created"} <time dateTime={iso}>{DATE_FORMAT.format(new Date(iso))}</time>
      </span>
    </p>
  );
}
