import type { JSONSchema7Type } from 'json-schema';

import type {
  RuntimeValueArrayInterface,
  RuntimeValueDateInterface,
  RuntimeValueMapInterface,
  RuntimeValueRecordInterface,
  RuntimeValueSetInterface
} from '../interfaces/index.js';

import { Predicates } from '../predicates/Predicates.js';
import { JsonObject } from './JsonObject.js';
import { JsonValue } from './JsonValue.js';

/**
 * Validates runtime operands that may contain JSON values together with native
 * Date, Map, and Set containers.
 *
 * Use JsonValue for JSON-only boundaries. Use this class where a runtime
 * value deliberately retains native collection and date semantics.
 */
export class RuntimeValue {
  /**
   * Returns whether a candidate is a finite, acyclic runtime value.
   *
   * JSON values and undefined are accepted alongside native Date, Map, Set,
   * array, and plain-record values whose nested values meet the same contract.
   */
  public static is(
    value: unknown
  ): value is JSONSchema7Type | undefined | RuntimeValueArrayInterface | RuntimeValueDateInterface | RuntimeValueMapInterface | RuntimeValueRecordInterface | RuntimeValueSetInterface {
    const ancestors = new Set<object>();
    const result = RuntimeValue.isValue(value, ancestors);
    return result;
  }

  /**
   * Returns a runtime value after validating it, or throws when the candidate
   * contains a value outside the runtime operand contract.
   */
  public static intake(
    value: unknown
  ): JSONSchema7Type | undefined | RuntimeValueArrayInterface | RuntimeValueDateInterface | RuntimeValueMapInterface | RuntimeValueRecordInterface | RuntimeValueSetInterface {
    if (!RuntimeValue.is(value)) {
      throw new TypeError('Runtime value must contain only JSON values, undefined, Date, Map, Set, arrays, and plain records.');
    }
    return value;
  }

  private static isValue(value: unknown, ancestors: Set<object>): boolean {
    if (value === undefined || JsonValue.is(value) || Predicates.isDate(value)) {
      return true;
    }
    if (Predicates.isArray(value)) {
      const result = RuntimeValue.isArray(value, ancestors);
      return result;
    }
    if (Predicates.isMap(value)) {
      const result = RuntimeValue.isMap(value, ancestors);
      return result;
    }
    if (Predicates.isSet(value)) {
      const result = RuntimeValue.isSet(value, ancestors);
      return result;
    }
    if (JsonObject.is(value)) {
      const result = RuntimeValue.isRecord(value, ancestors);
      return result;
    }
    return false;
  }

  private static isArray(value: readonly unknown[], ancestors: Set<object>): boolean {
    if (ancestors.has(value)) {
      return false;
    }
    ancestors.add(value);
    const length = value.length;
    for (let index = 0; index < length; index += 1) {
      const item: unknown = value[index];
      if (!RuntimeValue.isValue(item, ancestors)) {
        ancestors.delete(value);
        return false;
      }
    }
    ancestors.delete(value);
    return true;
  }

  private static isMap(value: Map<unknown, unknown>, ancestors: Set<object>): boolean {
    if (ancestors.has(value)) {
      return false;
    }
    ancestors.add(value);
    for (const [key, item] of value) {
      if (!RuntimeValue.isValue(key, ancestors) || !RuntimeValue.isValue(item, ancestors)) {
        ancestors.delete(value);
        return false;
      }
    }
    ancestors.delete(value);
    return true;
  }

  private static isRecord(value: Record<string, unknown>, ancestors: Set<object>): boolean {
    if (ancestors.has(value)) {
      return false;
    }
    ancestors.add(value);
    const keys = Object.keys(value);
    const length = keys.length;
    for (let index = 0; index < length; index += 1) {
      const key = keys[index]!;
      const item: unknown = Reflect.get(value, key);
      if (!RuntimeValue.isValue(item, ancestors)) {
        ancestors.delete(value);
        return false;
      }
    }
    ancestors.delete(value);
    return true;
  }

  private static isSet(value: Set<unknown>, ancestors: Set<object>): boolean {
    if (ancestors.has(value)) {
      return false;
    }
    ancestors.add(value);
    for (const item of value) {
      if (!RuntimeValue.isValue(item, ancestors)) {
        ancestors.delete(value);
        return false;
      }
    }
    ancestors.delete(value);
    return true;
  }
}
