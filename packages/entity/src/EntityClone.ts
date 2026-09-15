import { Predicates } from '@studnicky/types/node';

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
    if (!Predicates.isObjectLike(value)) {
      return value;
    }
    if (Predicates.isArray(value)) {
      const result: unknown[] = [];
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        result.push(EntityClone.cloneValue(value[index]));
      }
      return result;
    }
    if (Predicates.isMap(value)) {
      const result = new Map<unknown, unknown>();
      for (const [key, item] of value.entries()) {
        result.set(EntityClone.cloneValue(key), EntityClone.cloneValue(item));
      }
      return result;
    }
    if (Predicates.isSet(value)) {
      const result = new Set<unknown>();
      for (const item of value.values()) {
        result.add(EntityClone.cloneValue(item));
      }
      return result;
    }
    if (Predicates.isDate(value)) {
      const result = new Date(value.getTime());
      return result;
    }
    if (Predicates.isObject(value)) {
      const result: Record<string, unknown> = {};
      const keys = Object.keys(value);
      const keysLength = keys.length;
      for (let index = 0; index < keysLength; index += 1) {
        const key = keys[index];
        if (key === undefined) {
          continue;
        }
        Reflect.set(result, key, EntityClone.cloneValue(Reflect.get(value, key)));
      }
      return result;
    }
    return value;
  }
}
