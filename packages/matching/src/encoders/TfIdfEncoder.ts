import { RuntimeError } from '@studnicky/errors';

import { TokenExtractor } from '../extractors/TokenExtractor.js';

export class TfIdfEncoder {
  static encode(value: string, documentFrequency: ReadonlyMap<string, number>, documentCount: number): ReadonlyMap<string, number> {
    if (!Number.isInteger(documentCount) || documentCount <= 0) {
      throw RuntimeError.create('Document count must be a positive integer.');
    }
    const tokens = TokenExtractor.extract(value);
    const counts = new Map<string, number>();
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (token === undefined) {
        continue;
      }
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
    const result = new Map<string, number>();
    const length = tokens.length;
    for (const [token, count] of counts) {
      const frequency = documentFrequency.get(token) ?? 0;
      const weight = (count / length) * Math.log((documentCount + 1) / (frequency + 1));
      result.set(token, weight);
    }
    return result;
  }
}
