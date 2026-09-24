export class LevenshteinScorer {
  static score(left: string, right: string): number {
    if (left === right) {
      return 1;
    }
    if (left.length === 0 || right.length === 0) {
      return 0;
    }
    const distances = LevenshteinScorer.computeDistances(left, right);
    const distance = distances[right.length] ?? Math.max(left.length, right.length);
    const result = 1 - (distance / Math.max(left.length, right.length));
    return result;
  }

  private static computeDistances(left: string, right: string): number[] {
    let previous = LevenshteinScorer.createInitialRow(right.length);
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
      previous = LevenshteinScorer.computeRow(previous, left, right, leftIndex);
    }
    return previous;
  }

  private static createInitialRow(length: number): number[] {
    const row = Array.from<number>({ 'length': length + 1 });
    for (let index = 0; index <= length; index += 1) {
      row[index] = index;
    }
    return row;
  }

  private static computeRow(previous: number[], left: string, right: string, leftIndex: number): number[] {
    const current = [leftIndex];
    const leftCharacter = left[leftIndex - 1];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const insertion = (current[rightIndex - 1] ?? 0) + 1;
      const deletion = (previous[rightIndex] ?? 0) + 1;
      const replacement = (previous[rightIndex - 1] ?? 0) + (leftCharacter === right[rightIndex - 1] ? 0 : 1);
      current.push(Math.min(insertion, deletion, replacement));
    }
    return current;
  }
}
