import { TokenExtractor } from '../extractors/TokenExtractor.js';

export class MinimumHashEncoder {
  static encode(value: string, seed: number, signatureSize: number): readonly number[] {
    if (!Number.isInteger(signatureSize) || signatureSize <= 0) {
      throw new RangeError('Signature size must be a positive integer.');
    }
    const tokens = TokenExtractor.extract(value);
    const signature = Array.from<number>({ 'length': signatureSize }).fill(Number.MAX_SAFE_INTEGER);
    for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
      const token = tokens[tokenIndex];
      if (token === undefined) {
        continue;
      }
      for (let index = 0; index < signatureSize; index += 1) {
        const hash = MinimumHashEncoder.hash(token, seed + index);
        const previous = signature[index];
        if (previous !== undefined && hash < previous) {
          signature[index] = hash;
        }
      }
    }
    return signature;
  }

  private static hash(value: string, seed: number): number {
    let hash = seed >>> 0;
    for (const character of value) {
      hash = Math.imul(hash ^ character.codePointAt(0)!, 16_777_619) >>> 0;
    }
    return hash;
  }
}
