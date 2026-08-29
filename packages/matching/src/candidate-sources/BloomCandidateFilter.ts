import { RuntimeError } from '@studnicky/errors';

export class BloomCandidateFilter {
  readonly #bits: Uint8Array;
  readonly #hashCount: number;

  constructor(bitCount: number, hashCount: number) {
    if (!Number.isInteger(bitCount) || bitCount <= 0) {
      throw RuntimeError.create('Bit count must be a positive integer.');
    }
    if (!Number.isInteger(hashCount) || hashCount <= 0) {
      throw RuntimeError.create('Hash count must be a positive integer.');
    }
    this.#bits = new Uint8Array(Math.ceil(bitCount / 8));
    this.#hashCount = hashCount;
  }

  add(value: string): void {
    for (let index = 0; index < this.#hashCount; index += 1) {
      const bit = this.hash(value, index) % (this.#bits.length * 8);
      const byteIndex = Math.floor(bit / 8);
      const mask = 1 << (bit % 8);
      const current = this.#bits[byteIndex] ?? 0;
      this.#bits[byteIndex] = current | mask;
    }
  }

  mightContain(value: string): boolean {
    for (let index = 0; index < this.#hashCount; index += 1) {
      const bit = this.hash(value, index) % (this.#bits.length * 8);
      const byteIndex = Math.floor(bit / 8);
      const mask = 1 << (bit % 8);
      if (((this.#bits[byteIndex] ?? 0) & mask) === 0) {
        return false;
      }
    }
    return true;
  }

  private hash(value: string, seed: number): number {
    let hash = (2_166_136_261 ^ seed) >>> 0;
    for (const character of value) {
      hash = Math.imul(hash ^ character.codePointAt(0)!, 16_777_619) >>> 0;
    }
    return hash;
  }
}
