import { SameKindError } from '../errors/SameKindError.js';

/** Structural-kind proof that a produced value stands in for the value it was derived from. */

export class SameKind {
  /** True when `candidate` shares `original`'s primitive/array/null/Map/Set kind. */
  protected static holds<T>(candidate: unknown, original: T): candidate is T {
    const result = typeof candidate === typeof original
      && (candidate === null) === (original === null)
      && Array.isArray(candidate) === Array.isArray(original)
      && (candidate instanceof Map) === (original instanceof Map)
      && (candidate instanceof Set) === (original instanceof Set);
    return result;
  }

  /** Return `candidate` typed as `original`'s type after proving the kinds agree. */
  public static assert<T>(candidate: unknown, original: T): T {
    if (this.holds(candidate, original)) {
      return candidate;
    }
    throw new SameKindError('Derived value does not share the kind of its source value.');
  }
}
