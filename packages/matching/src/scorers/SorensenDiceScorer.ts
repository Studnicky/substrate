export class SorensenDiceScorer {
  static score<T>(left: ReadonlySet<T>, right: ReadonlySet<T>): number {
    if (left.size + right.size === 0) { return 1; }
    let intersection = 0;
    for (const value of left) { if (right.has(value)) { intersection += 1; } }
    const result = (2 * intersection) / (left.size + right.size);
    return result;
  }
}
