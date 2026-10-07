import type { EntityIntakeFunctionInterface } from '@studnicky/entity/interfaces';

import { JsonObject, Predicates } from '#runtime';


/** Builds detached projections of arrays and plain records without cloning collaborator instances. */
export class DefensiveSnapshot {
  private constructor() {}

  static record(value: Readonly<Record<string, unknown>>): Record<string, unknown> {
    const keys = Object.keys(value);
    const length = keys.length;
    const entries = new Map<string, unknown>();
    for (let index = 0; index < length; index += 1) {
      const key = keys[index];
      if (key === undefined) {
        continue;
      }
      entries.set(key, DefensiveSnapshot.value(Reflect.get(value, key)));
    }
    const result = JsonObject.fromEntries(entries);
    return result;
  }

  private static value(value: Parameters<EntityIntakeFunctionInterface<never>>[0]): Parameters<EntityIntakeFunctionInterface<never>>[0] {
    if (Predicates.isArray(value)) {
      const result: unknown[] = [];
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        result.push(DefensiveSnapshot.value(Reflect.get(value, index)));
      }
      return result;
    }

    if (!Predicates.isObjectLike(value)) {
      return value;
    }

    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      return value;
    }

    const keys = Object.keys(value);
    const length = keys.length;
    const entries = new Map<string, unknown>();
    for (let index = 0; index < length; index += 1) {
      const key = keys[index];
      if (key === undefined) {
        continue;
      }
      entries.set(key, DefensiveSnapshot.value(Reflect.get(value, key)));
    }
    const result = JsonObject.fromEntries(entries);
    return result;
  }
}
