/** Detects a cycle in an arbitrary value graph via `Array`/`Map`/`Set`/plain-object traversal. */
import { Predicates } from '@studnicky/types/node';

export class BoundaryCycleGuard {
  public static hasCycle(value: unknown, seen: WeakSet<object> = new WeakSet<object>()): boolean {
    if (!Predicates.isObjectLike(value)) {
      return false;
    }
    if (seen.has(value)) {
      return true;
    }

    seen.add(value);
    try {
      if (Predicates.isArray(value)) {
        const result = value.some((item) => {
          const hasCycle = BoundaryCycleGuard.hasCycle(item, seen);
          return hasCycle;
        });
        return result;
      }
      if (Predicates.isMap(value)) {
        for (const [key, item] of value.entries()) {
          if (BoundaryCycleGuard.hasCycle(key, seen) || BoundaryCycleGuard.hasCycle(item, seen)) {
            return true;
          }
        }
        return false;
      }
      if (Predicates.isSet(value)) {
        for (const item of value.values()) {
          if (BoundaryCycleGuard.hasCycle(item, seen)) {
            return true;
          }
        }
        return false;
      }

      const result = Object.values(value).some((item) => {
        const hasCycle = BoundaryCycleGuard.hasCycle(item, seen);
        return hasCycle;
      });
      return result;
    } finally {
      seen.delete(value);
    }
  }
}
