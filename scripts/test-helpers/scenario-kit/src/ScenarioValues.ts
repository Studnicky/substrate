import { Predicates } from '@studnicky/types/node';

import { ScenarioValueError } from './errors/ScenarioValueError.js';

/** Typed readers for values pulled out of untyped scenario data; each throws `ScenarioValueError` naming `label` when the value has the wrong type. */
export class ScenarioValues {
  static requireString(value: unknown, label: string): string {
    if (Predicates.isString(value)) {
      return value;
    }
    throw new ScenarioValueError(`${label} must be a string`);
  }

  static requireNumber(value: unknown, label: string): number {
    if (Predicates.isNumber(value)) {
      return value;
    }
    throw new ScenarioValueError(`${label} must be a number`);
  }

  static requireFiniteNumber(value: unknown, label: string): number {
    if (Predicates.isFiniteNumber(value)) {
      return value;
    }
    throw new ScenarioValueError(`${label} must be a finite number`);
  }

  static requireInteger(value: unknown, label: string): number {
    if (Number.isInteger(value) && Predicates.isNumber(value)) {
      return value;
    }
    throw new ScenarioValueError(`${label} must be an integer`);
  }

  static requireBoolean(value: unknown, label: string): boolean {
    if (Predicates.isBoolean(value)) {
      return value;
    }
    throw new ScenarioValueError(`${label} must be a boolean`);
  }

  static requireRecord(value: unknown, label: string): Record<string, unknown> {
    if (Predicates.isRecord(value)) {
      return value;
    }
    throw new ScenarioValueError(`${label} must be an object`);
  }

  static requireArray(value: unknown, label: string): readonly unknown[] {
    if (Predicates.isArray(value)) {
      return value;
    }
    throw new ScenarioValueError(`${label} must be an array`);
  }

  static requireStringArray(value: unknown, label: string): readonly string[] {
    const items = ScenarioValues.requireArray(value, label);
    const strings = items.map((item, index) => {
      const text = ScenarioValues.requireString(item, `${label}[${String(index)}]`);
      return text;
    });
    return strings;
  }

  static requireNumberArray(value: unknown, label: string): readonly number[] {
    const items = ScenarioValues.requireArray(value, label);
    const numbers = items.map((item, index) => {
      const number = ScenarioValues.requireNumber(item, `${label}[${String(index)}]`);
      return number;
    });
    return numbers;
  }

  /** Narrows an optional scenario field to its present value. */
  static requireDefined<TValue>(value: TValue | undefined, label: string): TValue {
    if (value === undefined) {
      throw new ScenarioValueError(`${label} is required`);
    }
    return value;
  }

  /** Reads an own property of a record, throwing when the record does not declare it. */
  static requireProperty(record: Readonly<Record<string, unknown>>, key: string, label: string): unknown {
    if (Object.hasOwn(record, key)) {
      return record[key];
    }
    throw new ScenarioValueError(`${label}.${key} is required`);
  }
}
