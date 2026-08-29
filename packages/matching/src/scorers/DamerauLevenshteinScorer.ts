export class DamerauLevenshteinScorer {
  static score(left: string, right: string): number {
    if (left === right) {
      return 1;
    }
    if (left.length === 0 || right.length === 0) {
      return 0;
    }
    const matrix = Array.from<number[]>({ 'length': left.length + 1 });
    for (let leftIndex = 0; leftIndex <= left.length; leftIndex += 1) {
      matrix[leftIndex] = Array.from<number>({ 'length': right.length + 1 }).fill(0);
    }
    for (let index = 0; index <= left.length; index += 1) { matrix[index]![0] = index; }
    for (let index = 0; index <= right.length; index += 1) { matrix[0]![index] = index; }
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
      for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
        const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
        const deletion = (matrix[leftIndex - 1]?.[rightIndex] ?? 0) + 1;
        const insertion = (matrix[leftIndex]?.[rightIndex - 1] ?? 0) + 1;
        const substitution = (matrix[leftIndex - 1]?.[rightIndex - 1] ?? 0) + cost;
        let distance = Math.min(deletion, insertion, substitution);
        if (leftIndex > 1 && rightIndex > 1 && left[leftIndex - 1] === right[rightIndex - 2] && left[leftIndex - 2] === right[rightIndex - 1]) {
          distance = Math.min(distance, (matrix[leftIndex - 2]?.[rightIndex - 2] ?? 0) + cost);
        }
        matrix[leftIndex]![rightIndex] = distance;
      }
    }
    const distance = matrix[left.length]?.[right.length] ?? Math.max(left.length, right.length);
    const result = 1 - (distance / Math.max(left.length, right.length));
    return result;
  }
}
