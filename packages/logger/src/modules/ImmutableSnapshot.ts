import { Predicates } from '@studnicky/types';

export class ImmutableSnapshot {
  public static from<T>(value: T): T {
    const snapshot = structuredClone(value);
    ImmutableSnapshot.#freeze(snapshot, new WeakSet<object>());
    return snapshot;
  }

  static #freeze(value: unknown, visited: WeakSet<object>): void {
    if (!Predicates.isObjectLike(value) || visited.has(value)) { return; }

    visited.add(value);
    const nestedValues: readonly unknown[] = Object.values(value);
    const length = nestedValues.length;
    for (let index = 0; index < length; index += 1) {
      const nested = nestedValues[index];
      ImmutableSnapshot.#freeze(nested, visited);
    }
    Object.freeze(value);
  }
}
