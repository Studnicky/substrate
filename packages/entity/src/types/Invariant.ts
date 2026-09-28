import type { InvariantFunctionInterface } from '../interfaces/InvariantFunctionInterface.js';
import type { InvariantType } from './InvariantType.js';

/**
 * Constructs and runs named cross-field invariants, each carrying a JSON
 * Pointer for its error location.
 *
 * @module
 */
export class Invariant {
  public static define<T>(name: string, check: InvariantFunctionInterface<T>, pointer = ''): InvariantType<T> {
    const invariant: InvariantType<T> = {
      'check': check,
      'name': name,
      'pointer': pointer
    };

    return invariant;
  }

  public static run<T>(invariant: InvariantType<T>, value: T): string | undefined {
    const result = invariant.check(value);

    return result;
  }
}
