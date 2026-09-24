export class JaroScorer {
  static score(left: string, right: string): number {
    if (left === right) {
      return 1;
    }
    if (left.length === 0 || right.length === 0) {
      return 0;
    }
    const leftMatches = Array.from<boolean>({ 'length': left.length }).fill(false);
    const rightMatches = Array.from<boolean>({ 'length': right.length }).fill(false);
    const matches = JaroScorer.findMatches(left, right, leftMatches, rightMatches);
    if (matches === 0) {
      return 0;
    }
    const transpositions = JaroScorer.countTranspositions(left, right, leftMatches, rightMatches);
    const result = JaroScorer.computeSimilarity(left, right, matches, transpositions);
    return result;
  }

  private static computeRange(left: string, right: string): number {
    const range = Math.max(0, Math.floor(Math.max(left.length, right.length) / 2) - 1);
    return range;
  }

  private static findMatches(left: string, right: string, leftMatches: boolean[], rightMatches: boolean[]): number {
    let matches = 0;
    for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
      const matched = JaroScorer.matchWindow(left, right, leftIndex, leftMatches, rightMatches);
      if (matched) {
        matches += 1;
      }
    }
    return matches;
  }

  /** Recomputes the shared window range per call; a pure O(1) function of the two lengths. */
  private static matchWindow(
    left: string,
    right: string,
    leftIndex: number,
    leftMatches: boolean[],
    rightMatches: boolean[]
  ): boolean {
    const range = JaroScorer.computeRange(left, right);
    const start = Math.max(0, leftIndex - range);
    const end = Math.min(leftIndex + range + 1, right.length);
    for (let rightIndex = start; rightIndex < end; rightIndex += 1) {
      if (rightMatches[rightIndex] === false && left[leftIndex] === right[rightIndex]) {
        leftMatches[leftIndex] = true;
        rightMatches[rightIndex] = true;
        return true;
      }
    }
    return false;
  }

  private static countTranspositions(left: string, right: string, leftMatches: boolean[], rightMatches: boolean[]): number {
    let transpositions = 0;
    let rightIndex = 0;
    for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
      if (leftMatches[leftIndex] !== true) {
        continue;
      }
      while (rightMatches[rightIndex] !== true) {
        rightIndex += 1;
      }
      if (left[leftIndex] !== right[rightIndex]) {
        transpositions += 1;
      }
      rightIndex += 1;
    }
    return transpositions;
  }

  private static computeSimilarity(left: string, right: string, matches: number, transpositions: number): number {
    const similarity = ((matches / left.length) + (matches / right.length) + ((matches - (transpositions / 2)) / matches)) / 3;
    return similarity;
  }
}
