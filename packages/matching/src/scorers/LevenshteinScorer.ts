export class LevenshteinScorer {
  static score(left: string, right: string): number {
    if (left === right) {
      return 1;
    }
    if (left.length === 0 || right.length === 0) {
      return 0;
    }
    let previous = Array.from<number>({ 'length': right.length + 1 });
    for (let index = 0; index <= right.length; index += 1) {
      previous[index] = index;
    }
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
      const current = [leftIndex];
      const leftCharacter = left[leftIndex - 1];
      for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
        const insertion = (current[rightIndex - 1] ?? 0) + 1;
        const deletion = (previous[rightIndex] ?? 0) + 1;
        const replacement = (previous[rightIndex - 1] ?? 0) + (leftCharacter === right[rightIndex - 1] ? 0 : 1);
        current.push(Math.min(insertion, deletion, replacement));
      }
      previous = current;
    }
    const distance = previous[right.length] ?? Math.max(left.length, right.length);
    const result = 1 - (distance / Math.max(left.length, right.length));
    return result;
  }
}
