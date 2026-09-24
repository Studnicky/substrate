import { RuntimeValuePredicates } from './RuntimeValuePredicates.js';

/** Reference-cycle detection across arrays, `Map`, `Set`, and plain-object graphs. */
export class CycleDetectionPredicates extends RuntimeValuePredicates {
  /**
   * Returns true when an object graph contains a reference cycle.
   * Arrays, Maps (keys and values), Sets, and the enumerable own properties of every other
   * object-like value are traversed recursively.
   */
  public static hasCycle(value: unknown): boolean {
    const result = CycleDetectionPredicates.valueHasCycle(value, new Set());
    return result;
  }

  private static arrayHasCycle(value: readonly unknown[], ancestors: Set<object>): boolean {
    for (let index = 0; index < value.length; index += 1) {
      if (CycleDetectionPredicates.valueHasCycle(value[index], ancestors)) {
        return true;
      }
    }

    return false;
  }

  /** Dispatches by container shape; each branch walks its own children for a cycle. */
  private static childrenHaveCycle(value: object, ancestors: Set<object>): boolean {
    if (Array.isArray(value)) {
      const result = CycleDetectionPredicates.arrayHasCycle(value, ancestors);
      return result;
    }
    if (value instanceof Map) {
      const result = CycleDetectionPredicates.mapHasCycle(value, ancestors);
      return result;
    }
    if (value instanceof Set) {
      const result = CycleDetectionPredicates.setHasCycle(value, ancestors);
      return result;
    }
    if (CycleDetectionPredicates.isRecord(value)) {
      const result = CycleDetectionPredicates.recordHasCycle(value, ancestors);
      return result;
    }

    return false;
  }

  private static mapHasCycle(value: Map<unknown, unknown>, ancestors: Set<object>): boolean {
    for (const [key, item] of value.entries()) {
      if (CycleDetectionPredicates.valueHasCycle(key, ancestors) || CycleDetectionPredicates.valueHasCycle(item, ancestors)) {
        return true;
      }
    }

    return false;
  }

  private static recordHasCycle(value: Record<string, unknown>, ancestors: Set<object>): boolean {
    const values = Object.values(value);
    for (let index = 0; index < values.length; index += 1) {
      if (CycleDetectionPredicates.valueHasCycle(values[index], ancestors)) {
        return true;
      }
    }

    return false;
  }

  private static setHasCycle(value: ReadonlySet<unknown>, ancestors: Set<object>): boolean {
    for (const item of value.values()) {
      if (CycleDetectionPredicates.valueHasCycle(item, ancestors)) {
        return true;
      }
    }

    return false;
  }

  private static valueHasCycle(value: unknown, ancestors: Set<object>): boolean {
    if (!CycleDetectionPredicates.isObjectLike(value)) {
      return false;
    }
    if (ancestors.has(value)) {
      return true;
    }

    ancestors.add(value);
    const hasCycle = CycleDetectionPredicates.childrenHaveCycle(value, ancestors);
    ancestors.delete(value);

    return hasCycle;
  }
}
