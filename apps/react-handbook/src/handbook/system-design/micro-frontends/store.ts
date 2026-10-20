// The sample store every demo on the page works on: a shell owned by the
// platform team and three micro frontends, each owned by one product team.

export type PieceId = "shell" | "catalog" | "checkout" | "account";

/** Where a piece renders on the product page, which mixes three of them. */
export type Slot = "header" | "main" | "aside-cart" | "aside-recent";

export type Piece = {
  id: PieceId;
  name: string;
  team: string;
  /** Route prefixes the piece owns; the shell owns the frame around them. */
  owns: readonly string[];
  /** What the piece renders on the product page. */
  onProductPage: { slot: Slot; label: string };
  /** Simulated size of the piece's own JavaScript, in kB (gzip). */
  kb: number;
  version: string;
};

export const PIECES: readonly Piece[] = [
  {
    id: "shell",
    name: "Shell",
    team: "Platform",
    owns: [],
    onProductPage: { slot: "header", label: "Header, nav and cart count" },
    kb: 40,
    version: "4.2.0",
  },
  {
    id: "catalog",
    name: "Catalog",
    team: "Discovery",
    owns: ["/", "/search", "/products"],
    onProductPage: { slot: "main", label: "Product details" },
    kb: 90,
    version: "3.8.1",
  },
  {
    id: "checkout",
    name: "Checkout",
    team: "Checkout",
    owns: ["/cart", "/checkout"],
    onProductPage: { slot: "aside-cart", label: "Mini cart" },
    kb: 70,
    version: "2.4.0",
  },
  {
    id: "account",
    name: "Account",
    team: "Accounts",
    owns: ["/account"],
    onProductPage: { slot: "aside-recent", label: "Recently viewed" },
    kb: 50,
    version: "1.9.3",
  },
];

export const TEAM_PIECES = PIECES.filter((p) => p.id !== "shell");

const BY_ID = new Map(PIECES.map((p) => [p.id, p]));

export function piece(id: PieceId): Piece {
  return BY_ID.get(id)!;
}
