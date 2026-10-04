import { MatchingAllocationError } from '../errors/MatchingAllocationError.js';

/** Allocates scorer working arrays once per invocation; a length the platform cannot allocate surfaces as `MatchingAllocationError`. */
export class ScorerAllocator {
  static filled<TValue>(length: number, value: TValue): TValue[] {
    try {
      const result = Array.from<TValue>({ 'length': length }).fill(value);
      return result;
    } catch (error) {
      throw new MatchingAllocationError(`Cannot allocate a working array of length ${String(length)}`, error);
    }
  }
}
