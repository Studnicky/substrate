export class JaroScorer {
  static score(left: string, right: string): number {
    if (left === right) {
      return 1;
    }
    if (left.length === 0 || right.length === 0) {
      return 0;
    }
    const range = Math.max(0, Math.floor(Math.max(left.length, right.length) / 2) - 1);
    const leftMatches = Array.from<boolean>({ 'length': left.length }).fill(false);
    const rightMatches = Array.from<boolean>({ 'length': right.length }).fill(false);
    let matches = 0;
    for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
      const start = Math.max(0, leftIndex - range);
      const end = Math.min(leftIndex + range + 1, right.length);
      for (let rightIndex = start; rightIndex < end; rightIndex += 1) {
        if (rightMatches[rightIndex] === false && left[leftIndex] === right[rightIndex]) {
          leftMatches[leftIndex] = true;
          rightMatches[rightIndex] = true;
          matches += 1;
          break;
        }
      }
    }
    if (matches === 0) {
      return 0;
    }
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
    const matching = matches;
    const result = ((matching / left.length) + (matching / right.length) + ((matching - (transpositions / 2)) / matching)) / 3;
    return result;
  }
}
