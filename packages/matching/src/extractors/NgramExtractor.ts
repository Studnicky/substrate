import { RuntimeError } from '@studnicky/errors';

import { StringNormalizer } from '../normalizers/StringNormalizer.js';

export class NgramExtractor {
  static extract(value: string, size: number): readonly string[] {
    if (!Number.isInteger(size) || size <= 0) {
      throw RuntimeError.create('N-gram size must be a positive integer.');
    }
    const normalized = StringNormalizer.normalize(value);
    const characters = Array.from(normalized);
    if (characters.length < size) {
      const result = characters.length === 0 ? [] : [normalized];
      return result;
    }
    const result: string[] = [];
    const finalStart = characters.length - size;
    for (let start = 0; start <= finalStart; start += 1) {
      result.push(characters.slice(start, start + size).join(''));
    }
    return result;
  }
}
