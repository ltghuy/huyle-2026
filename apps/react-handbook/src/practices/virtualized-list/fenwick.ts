// Fenwick (binary indexed) tree over row sizes. Gives the offset of a row,
// the row at an offset, and a size update, each in O(log n). A plain
// prefix-sum array would need O(n) work for every measured row.

export class Fenwick {
  private readonly tree: Float64Array;
  readonly length: number;
  /** Highest power of two ≤ length, for the descent in `indexAt`. */
  private readonly topBit: number;

  constructor(sizes: ArrayLike<number>) {
    this.length = sizes.length;
    this.tree = new Float64Array(this.length + 1);
    // O(n) build: add each node into its parent.
    for (let i = 1; i <= this.length; i++) {
      this.tree[i] += sizes[i - 1];
      const parent = i + (i & -i);
      if (parent <= this.length) this.tree[parent] += this.tree[i];
    }
    let bit = 1;
    while (bit * 2 <= this.length) bit *= 2;
    this.topBit = bit;
  }

  /** Adds `delta` to the size of row `index`. */
  add(index: number, delta: number) {
    for (let i = index + 1; i <= this.length; i += i & -i) this.tree[i] += delta;
  }

  /** Sum of the sizes of rows [0, end): the offset of row `end`. */
  prefix(end: number) {
    let sum = 0;
    for (let i = Math.min(end, this.length); i > 0; i -= i & -i) sum += this.tree[i];
    return sum;
  }

  get total() {
    return this.prefix(this.length);
  }

  /**
   * The row containing pixel `offset`: the largest index whose start is
   * ≤ offset. Clamped to [0, length - 1]; 0 for an empty tree.
   */
  indexAt(offset: number) {
    if (this.length === 0) return 0;
    let pos = 0;
    let remaining = offset;
    for (let bit = this.topBit; bit > 0; bit >>= 1) {
      const next = pos + bit;
      if (next <= this.length && this.tree[next] <= remaining) {
        pos = next;
        remaining -= this.tree[next];
      }
    }
    return Math.min(pos, this.length - 1);
  }
}
