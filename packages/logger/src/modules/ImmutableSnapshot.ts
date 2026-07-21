export class ImmutableSnapshot {
  public static from<T>(value: T): T {
    const snapshot = structuredClone(value);
    ImmutableSnapshot.#freeze(snapshot, new WeakSet<object>());
    return snapshot;
  }

  static #freeze(value: unknown, visited: WeakSet<object>): void {
    if (value === null || typeof value !== 'object' || visited.has(value)) { return; }

    visited.add(value);
    for (const nested of Object.values(value)) {
      ImmutableSnapshot.#freeze(nested, visited);
    }
    Object.freeze(value);
  }
}
