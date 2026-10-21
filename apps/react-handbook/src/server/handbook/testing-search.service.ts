import "server-only";

import { findProducts, type SearchShape, shapeReply } from "./testing-search.schema";

export function searchProducts(query: string, shape: SearchShape) {
  return shapeReply(findProducts(query), shape);
}
