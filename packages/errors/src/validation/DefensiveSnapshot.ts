import type { EntityIntakeFunctionInterface } from '../interfaces/EntityIntakeFunctionInterface.js';

/** Builds detached projections of arrays and plain records without cloning collaborator instances. */
export class DefensiveSnapshot {
  private constructor() {}

  static record(value: Readonly<Record<string, unknown>>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const keys = Object.keys(value);
    const length = keys.length;
    for (let index = 0; index < length; index += 1) {
      const key = keys[index];
      if (key === undefined) {
        continue;
      }
      Reflect.set(result, key, DefensiveSnapshot.value(Reflect.get(value, key)));
    }
    return result;
  }

  private static value(value: Parameters<EntityIntakeFunctionInterface<never>>[0]): Parameters<EntityIntakeFunctionInterface<never>>[0] {
    if (Array.isArray(value)) {
      const result: unknown[] = [];
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        result.push(DefensiveSnapshot.value(Reflect.get(value, index)));
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
    const keys = Object.keys(value);
    const length = keys.length;
    for (let index = 0; index < length; index += 1) {
      const key = keys[index];
      if (key === undefined) {
        continue;
      }
      Reflect.set(result, key, DefensiveSnapshot.value(Reflect.get(value, key)));
    }
    return result;
  }
}
