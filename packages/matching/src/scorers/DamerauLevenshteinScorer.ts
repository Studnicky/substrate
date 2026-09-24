export class DamerauLevenshteinScorer {
  static score(left: string, right: string): number {
    if (left === right) {
      return 1;
    }
    if (left.length === 0 || right.length === 0) {
      return 0;
    }
    const matrix = DamerauLevenshteinScorer.createMatrix(left.length, right.length);
    DamerauLevenshteinScorer.fillMatrix(matrix, left, right);
    const distance = matrix[left.length]?.[right.length] ?? Math.max(left.length, right.length);
    const result = 1 - (distance / Math.max(left.length, right.length));
    return result;
  }

  private static createMatrix(leftLength: number, rightLength: number): number[][] {
    const matrix = Array.from<number[]>({ 'length': leftLength + 1 });
    for (let leftIndex = 0; leftIndex <= leftLength; leftIndex += 1) {
      matrix[leftIndex] = Array.from<number>({ 'length': rightLength + 1 }).fill(0);
    }
    for (let index = 0; index <= leftLength; index += 1) { matrix[index]![0] = index; }
    for (let index = 0; index <= rightLength; index += 1) { matrix[0]![index] = index; }
    return matrix;
  }

  private static fillMatrix(matrix: number[][], left: string, right: string): void {
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
      for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
        matrix[leftIndex]![rightIndex] = DamerauLevenshteinScorer.computeCell(matrix, left, right, leftIndex, rightIndex);
      }
    }
  }

  private static computeCell(matrix: number[][], left: string, right: string, leftIndex: number, rightIndex: number): number {
    const cost = DamerauLevenshteinScorer.computeSubstitutionCost(left, right, leftIndex, rightIndex);
    const baseDistance = DamerauLevenshteinScorer.computeBaseDistance(matrix, leftIndex, rightIndex, cost);
    if (!DamerauLevenshteinScorer.isTransposition(left, right, leftIndex, rightIndex)) {
      return baseDistance;
    }
    const transposed = (matrix[leftIndex - 2]?.[rightIndex - 2] ?? 0) + cost;
    const distance = Math.min(baseDistance, transposed);
    return distance;
  }

  private static computeSubstitutionCost(left: string, right: string, leftIndex: number, rightIndex: number): number {
    const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
    return cost;
  }

  private static computeBaseDistance(matrix: number[][], leftIndex: number, rightIndex: number, cost: number): number {
    const deletion = (matrix[leftIndex - 1]?.[rightIndex] ?? 0) + 1;
    const insertion = (matrix[leftIndex]?.[rightIndex - 1] ?? 0) + 1;
    const substitution = (matrix[leftIndex - 1]?.[rightIndex - 1] ?? 0) + cost;
    const distance = Math.min(deletion, insertion, substitution);
    return distance;
  }

  /** True when the current pair forms an adjacent-letter swap of the previous pair. */
  private static isTransposition(left: string, right: string, leftIndex: number, rightIndex: number): boolean {
    const transposed = leftIndex > 1
      && rightIndex > 1
      && left[leftIndex - 1] === right[rightIndex - 2]
      && left[leftIndex - 2] === right[rightIndex - 1];
    return transposed;
  }
}
