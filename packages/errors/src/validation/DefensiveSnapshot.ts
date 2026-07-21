/** Builds detached projections of arrays and plain records without cloning collaborator instances. */
export class DefensiveSnapshot {
  private constructor() {}

  static record(value: Readonly<Record<string, unknown>>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      result[key] = DefensiveSnapshot.value(nested);
    }
    return result;
  }

  private static value(value: unknown): unknown {
    if (Array.isArray(value)) {
      const result: unknown[] = [];
      for (const nested of value) {
        result.push(DefensiveSnapshot.value(nested));
      }
      return result;
    }

    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      return value;
    }

    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      result[key] = DefensiveSnapshot.value(nested);
    }
    return result;
  }
}
