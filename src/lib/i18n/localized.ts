import type { Locale } from "./config";

/**
 * A string that exists in every supported locale. Used for translatable fields
 * in the structured content data (`src/content/*.ts`), where non-translatable
 * structural fields (tech, company, hrefs, image srcs, icons) stay shared and
 * only the prose varies. Read with `field[locale]`.
 */
export type LocalizedString = Record<Locale, string>;

/** Same, for a list of strings (e.g. a role's highlight bullets). */
export type LocalizedList = Record<Locale, readonly string[]>;
