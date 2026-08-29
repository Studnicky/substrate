export class CosineScorer {
  static score(left: ReadonlyMap<string, number>, right: ReadonlyMap<string, number>): number {
    let dot = 0;
    let leftMagnitude = 0;
    let rightMagnitude = 0;
    for (const value of left.values()) { leftMagnitude += value * value; }
    for (const value of right.values()) { rightMagnitude += value * value; }
    for (const [key, value] of left) { dot += value * (right.get(key) ?? 0); }
    if (leftMagnitude === 0 || rightMagnitude === 0) { return 0; }
    const result = dot / Math.sqrt(leftMagnitude * rightMagnitude);
    return result;
  }
}
