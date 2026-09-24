import { JsonObject, Predicates } from '@studnicky/types/browser';

/** Cycle-safe deep clone for entity boundaries. */
export class EntityClone {
  public static clone(value: unknown, onCycle: () => never): unknown {
    if (Predicates.hasCycle(value)) {
      onCycle();
    }
    const result = EntityClone.cloneValue(value);
    return result;
  }

  private static cloneValue(value: unknown): unknown {
    if (!Predicates.isObjectLike(value)) { return value; }
    if (Predicates.isArray(value)) { const result = EntityClone.cloneArray(value); return result; }
    if (Predicates.isMap(value)) { const result = EntityClone.cloneMap(value); return result; }
    if (Predicates.isSet(value)) { const result = EntityClone.cloneSet(value); return result; }
    if (Predicates.isDate(value)) { const result = new Date(value.getTime()); return result; }
    if (Predicates.isObject(value)) { const result = EntityClone.cloneObject(value); return result; }
    return value;
  }

  private static cloneArray(value: readonly unknown[]): unknown[] {
    const result: unknown[] = [];
    const length = value.length;
    for (let index = 0; index < length; index += 1) {
      result.push(EntityClone.cloneValue(value[index]));
    }
    return result;
  }

  private static cloneMap(value: ReadonlyMap<unknown, unknown>): Map<unknown, unknown> {
    const result = new Map<unknown, unknown>();
    for (const [key, item] of value.entries()) {
      result.set(EntityClone.cloneValue(key), EntityClone.cloneValue(item));
    }
    return result;
  }

  private static cloneSet(value: ReadonlySet<unknown>): Set<unknown> {
    const result = new Set<unknown>();
    for (const item of value.values()) {
      result.add(EntityClone.cloneValue(item));
    }
    return result;
  }

  private static cloneObject(value: object): unknown {
    const keys = Object.keys(value);
    const keysLength = keys.length;
    const entries = new Map<string, unknown>();
    for (let index = 0; index < keysLength; index += 1) {
      const key = keys[index];
      if (key === undefined) { continue; }
      entries.set(key, EntityClone.cloneValue(Reflect.get(value, key)));
    }
    const result = JsonObject.fromEntries(entries);
    return result;
  }
}
