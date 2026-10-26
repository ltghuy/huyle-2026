import { z } from "zod";

// Shared by the mock API and the board (no `server-only`).

export const SECTORS = [
  "Technology", "Financials", "Health Care", "Energy", "Industrials", "Utilities",
  "Materials", "Real Estate", "Consumer Staples", "Consumer Discretionary", "Communication",
] as const;
export type Sector = (typeof SECTORS)[number];

export const DATASET_SIZES = [5000, 20000, 50000] as const;
export type DatasetSize = (typeof DATASET_SIZES)[number];
export const DEFAULT_SIZE: DatasetSize = 20000;

export type Instrument = {
  /** Unique and stable; not the instrument's position in the list. */
  id: number;
  symbol: string;
  name: string;
  sector: Sector;
  price: number;
  /** Percent change since the open, 2 decimals. */
  change: number;
  volume: number;
  /** Epoch ms of the last update. */
  updatedAt: number;
};

export const datasetParamsSchema = z.object({
  size: z.coerce.number().pipe(z.union(DATASET_SIZES.map((n) => z.literal(n)))).default(DEFAULT_SIZE),
});
