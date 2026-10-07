function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

/** Stable key serialization: object properties are sorted, arrays keep order. */
export function hashKey(key: readonly unknown[]): string {
  return JSON.stringify(key, (_, value) =>
    isPlainObject(value)
      ? Object.fromEntries(Object.keys(value).sort().map((k) => [k, value[k]]))
      : value,
  );
}
