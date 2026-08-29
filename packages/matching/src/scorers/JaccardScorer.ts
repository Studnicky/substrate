export class JaccardScorer {
  static score<T>(left: ReadonlySet<T>, right: ReadonlySet<T>): number {
    const union = new Set<T>(left);
    for (const value of right) { union.add(value); }
    if (union.size === 0) { return 1; }
    let intersection = 0;
    for (const value of left) { if (right.has(value)) { intersection += 1; } }
    const result = intersection / union.size;
    return result;
  }
}
