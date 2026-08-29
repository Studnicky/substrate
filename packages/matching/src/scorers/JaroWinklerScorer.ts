import { JaroScorer } from './JaroScorer.js';

export class JaroWinklerScorer {
  static score(left: string, right: string): number {
    const jaro = JaroScorer.score(left, right);
    let prefix = 0;
    const maximum = Math.min(4, left.length, right.length);
    while (prefix < maximum && left[prefix] === right[prefix]) {
      prefix += 1;
    }
    const result = jaro + (prefix * 0.1 * (1 - jaro));
    return result;
  }
}
