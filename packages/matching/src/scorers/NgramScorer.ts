import { NgramExtractor } from '../extractors/NgramExtractor.js';
import { JaccardScorer } from './JaccardScorer.js';

export class NgramScorer {
  static score(left: string, right: string, size: number): number {
    const leftNgrams = new Set(NgramExtractor.extract(left, size));
    const rightNgrams = new Set(NgramExtractor.extract(right, size));
    const result = JaccardScorer.score(leftNgrams, rightNgrams);
    return result;
  }
}
