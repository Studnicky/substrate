// WHY THIS EXISTS.
//
// The same WeakSet-based graph walk — recurse through arrays, `Map` entries, `Set` members, and
// plain-object properties, bail out the instant a node is revisited — was hand-written twice:
// once inside `@studnicky/errors`' `EntityIntake.cloneValue` (as an inline ancestor check baked
// into the clone itself) and once as `@studnicky/json`'s `SchemaValidator.hasCloneCycle` (a
// standalone pre-check ahead of `structuredClone`). Both exist to answer the same question before
// trusting arbitrary input: does this value contain a cycle a JSON-shaped or entity-shaped model
// cannot represent. Extracting the walk here lets both call the same code instead of maintaining
// two copies that can silently drift apart.
//
// `@studnicky/json`'s `DataType.walkForCycle` is a close relative but not a duplicate — it gates
// its generic branch on `isPlainObject`, deliberately excluding class instances from recursion
// for structural-equality purposes, where this walk (matching `errors`/`json`'s intake behavior)
// recurses into any object. That's a real behavioral difference, not incidental duplication, so
// `DataType` is left as its own implementation.

/** Detects a cycle in an arbitrary value graph via `Array`/`Map`/`Set`/plain-object traversal. */
import { Predicates } from '@studnicky/types';

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
