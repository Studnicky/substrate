/** Static predicate library for JSON Schema draft 2020-12 validation. */

import { DataType } from '@studnicky/json';

import type { CoerceToBooleanResultType } from './CoerceToBooleanResultType.js';
import type { CoerceToNumberResultType } from './CoerceToNumberResultType.js';

/** Scaling factor applied to `Number.EPSILON` when testing `multipleOf`. */
const multipleOfEpsilonFactor = 10;

/** Content encodings actively validated at runtime. */
const supportedContentEncodings: ReadonlySet<string> = new Set(['base64', 'base64url']);

/** Content media types actively validated at runtime. */
const supportedContentMediaTypes: ReadonlySet<string> = new Set(['application/json']);

export class Predicates {
  private static readonly coercionHandlers = new Map<string, (value: unknown) => unknown>([
    [
      'array',
      (value: unknown): unknown => {
        return !Array.isArray(value) && typeof value !== 'object' ? [value] : value;
      }
    ],
    [
      'boolean',
      (value: unknown): unknown => {
        if (typeof value === 'string') {
          return Predicates.coerceToBoolean(value) ?? value;
        }
        if (value === 1) {
          return true;
        }
        if (value === 0) {
          return false;
        }

        return value;
      }
    ],
    [
      'integer',
      (value: unknown): unknown => {
        if (typeof value === 'string') {
          const coerced = Predicates.coerceToNumber(value);

          return coerced === undefined ? value : Math.trunc(coerced);
        }
        if (typeof value === 'boolean') {
          return value ? 1 : 0;
        }

        return value;
      }
    ],
    [
      'null',
      (value: unknown): unknown => {
        return value === '' || value === 'null' ? null : value;
      }
    ],
    [
      'number',
      (value: unknown): unknown => {
        if (typeof value === 'string') {
          return Predicates.coerceToNumber(value) ?? value;
        }
        if (typeof value === 'boolean') {
          return value ? 1 : 0;
        }

        return value;
      }
    ],
    [
      'string',
      (value: unknown): unknown => {
        return typeof value === 'string' ? value : String(value);
      }
    ]
  ]);

  private static readonly typeMatchers = new Map<string, (value: unknown) => boolean>([
    [
      'array',
      (value: unknown): boolean => {
        return Array.isArray(value);
      }
    ],
    [
      'integer',
      (value: unknown): boolean => {
        return Predicates.isIntegerValue(value);
      }
    ],
    [
      'null',
      (value: unknown): boolean => {
        return value === null;
      }
    ],
    [
      'number',
      (value: unknown): boolean => {
        return Predicates.isFiniteNumber(value);
      }
    ],
    [
      'object',
      (value: unknown): boolean => {
        return Predicates.inferValueType(value) === 'object';
      }
    ]
  ]);

  /** Count Unicode code points without allocating an intermediate array. */
  static codePointLength(str: string): number {
    let length = 0;

    for (let index = 0; index < str.length; index++) {
      length++;
      const code = str.codePointAt(index);

      if (code !== undefined && code > 0xFF_FF) {
        index++;
      }
    }

    return length;
  }

  /** Returns true as soon as `target` code points have been counted; stops early. */
  private static codePointLengthAtLeast(str: string, target: number): boolean {
    let count = 0;

    for (let index = 0; index < str.length; index++) {
      count++;
      if (count >= target) {
        return true;
      }
      const code = str.codePointAt(index);

      if (code !== undefined && code > 0xFF_FF) {
        index++;
      }
    }

    return count >= target;
  }

  /** Returns false as soon as code-point count exceeds `limit`; stops early. */
  private static codePointLengthAtMost(str: string, limit: number): boolean {
    let count = 0;

    for (let index = 0; index < str.length; index++) {
      count++;
      if (count > limit) {
        return false;
      }
      const code = str.codePointAt(index);

      if (code !== undefined && code > 0xFF_FF) {
        index++;
      }
    }

    return true;
  }

  /** Coerce string to boolean; returns true/false for recognised literals, undefined otherwise. */
  static coerceToBoolean(value: string): CoerceToBooleanResultType {
    if (value === 'true' || value === '1') {
      return true;
    }
    if (value === 'false' || value === '0') {
      return false;
    }

    return undefined;
  }

  /** Coerce string to finite number; returns undefined for Infinity, NaN, or non-numeric. */
  static coerceToNumber(value: string): CoerceToNumberResultType {
    const coerced = Number(value);

    return Number.isFinite(coerced) ? coerced : undefined;
  }

  /** Attempt coercion in schema-type order; returns first successful result or original value. */
  static coerceValue(schemaTypes: string[], value: unknown): unknown {
    if (value === undefined || value === null || schemaTypes.length === 0) {
      return value;
    }

    for (const type of schemaTypes) {
      const coercer = Predicates.coercionHandlers.get(type);

      if (coercer !== undefined) {
        const result = coercer(value);

        if (result !== value) {
          return result;
        }
      }
    }

    return value;
  }

  /** Infer the JSON Schema type name of a value. */
  static inferValueType(value: unknown): string {
    if (value === null) {
      return 'null';
    }
    if (Array.isArray(value)) {
      return 'array';
    }

    return typeof value;
  }

  static isFiniteNumber(value: unknown): boolean {
    return typeof value === 'number' && Number.isFinite(value);
  }

  static isIntegerValue(value: unknown): boolean {
    return typeof value === 'number' && Number.isInteger(value);
  }

  static matchesAnyType(schemaTypes: string[], value: unknown): boolean {
    return schemaTypes.some((schemaType: string): boolean => {
      return Predicates.matchesType(schemaType, value);
    });
  }

  static matchesType(schemaType: string, value: unknown): boolean {
    const matcher = Predicates.typeMatchers.get(schemaType);

    return matcher === undefined ? Predicates.inferValueType(value) === schemaType : matcher(value);
  }

  static satisfiesConst(value: unknown, constValue: unknown): boolean {
    return DataType.deepEqual(value, constValue);
  }

  static satisfiesEnum(value: unknown, enumValues: unknown[]): boolean {
    return enumValues.some((enumValue: unknown): boolean => {
      return DataType.deepEqual(value, enumValue);
    });
  }

  static checkMinimum(value: number, minimum: number, exclusive: boolean): boolean {
    return exclusive ? value > minimum : value >= minimum;
  }

  static checkMaximum(value: number, maximum: number, exclusive: boolean): boolean {
    return exclusive ? value < maximum : value <= maximum;
  }

  /** Uses epsilon tolerance for floating-point rounding errors. */
  static checkMultipleOf(value: number, divisor: number): boolean {
    if (divisor === 0) {
      return false;
    }
    const quotient = value / divisor;

    return Math.abs(quotient - Math.round(quotient)) <= Number.EPSILON * multipleOfEpsilonFactor;
  }

  static satisfiesMinimum(value: number, minimum: number): boolean {
    return value >= minimum;
  }

  static satisfiesMaximum(value: number, maximum: number): boolean {
    return value <= maximum;
  }

  static satisfiesExclusiveMinimum(value: number, limit: number): boolean {
    return value > limit;
  }

  static satisfiesExclusiveMaximum(value: number, limit: number): boolean {
    return value < limit;
  }

  static satisfiesMultipleOf(value: number, divisor: number): boolean {
    return Predicates.checkMultipleOf(value, divisor);
  }

  /** Fast-paths: len<min→false, len>=2*min→true; walks code points only in residual band. */
  static checkMinLength(value: string, minimum: number): boolean {
    return Predicates.satisfiesMinLength(value, minimum);
  }

  /** Fast-path: code_points <= utf16_length, so value.length<=max is definitely true. */
  static checkMaxLength(value: string, maximum: number): boolean {
    return Predicates.satisfiesMaxLength(value, maximum);
  }

  static checkPattern(value: string, pattern: RegExp | string): boolean {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'u');

    return regex.test(value);
  }

  static satisfiesMinLength(value: string, minimum: number): boolean {
    const len = value.length;

    if (len < minimum) {
      return false;
    }
    if (len >= minimum * 2) {
      return true;
    }

    return Predicates.codePointLengthAtLeast(value, minimum);
  }

  static satisfiesMaxLength(value: string, maximum: number): boolean {
    if (value.length <= maximum) {
      return true;
    }

    return Predicates.codePointLengthAtMost(value, maximum);
  }

  static satisfiesPattern(value: string, regex: RegExp): boolean {
    return regex.test(value);
  }

  /** Only base64/base64url are actively checked; unknown encodings return true per spec. */
  static satisfiesContentEncoding(value: string, encoding: string): boolean {
    if (!supportedContentEncodings.has(encoding)) {
      return true;
    }

    return Predicates.#decodeBase64Safe(value, encoding === 'base64url') !== null;
  }

  /** Only application/json is actively checked; unknown media types return true per spec. */
  static satisfiesContentMediaType(value: string, mediaType: string, encoding?: string): boolean {
    if (!supportedContentMediaTypes.has(mediaType)) {
      return true;
    }

    let content = value;

    if (encoding !== undefined && supportedContentEncodings.has(encoding)) {
      const decoded = Predicates.#decodeBase64Safe(value, encoding === 'base64url');

      if (decoded === null) {
        return false;
      }

      content = decoded;
    }

    if (mediaType === 'application/json') {
      return Predicates.#isValidJson(content);
    }

    return true;
  }

  static checkMinItems(value: unknown[], minimum: number): boolean {
    return value.length >= minimum;
  }

  static checkMaxItems(value: unknown[], maximum: number): boolean {
    return value.length <= maximum;
  }

  static checkUniqueItems(value: unknown[]): boolean {
    return Predicates.satisfiesUniqueItems(value);
  }

  /** Validates minContains/maxContains bounds against match count from a contains schema. */
  static satisfiesContains(
    matchCount: number,
    minContains: number | undefined,
    maxContains: number | undefined
  ): boolean {
    const minimum = minContains ?? (maxContains === undefined ? 1 : 0);

    if (matchCount < minimum) {
      return false;
    }
    if (maxContains !== undefined && matchCount > maxContains) {
      return false;
    }

    return true;
  }

  static satisfiesMinItems(value: unknown[], minimum: number): boolean {
    return value.length >= minimum;
  }

  static satisfiesMaxItems(value: unknown[], maximum: number): boolean {
    return value.length <= maximum;
  }

  static satisfiesUniqueItems(value: unknown[]): boolean {
    for (let index = 0; index < value.length; index++) {
      for (let other = index + 1; other < value.length; other++) {
        if (DataType.deepEqual(value[index], value[other])) {
          return false;
        }
      }
    }

    return true;
  }

  static checkRequired(value: Record<string, unknown>, required: string[]): boolean {
    return Predicates.hasAllRequiredProperties(value, required);
  }

  static hasAllRequiredProperties(value: Record<string, unknown>, required: string[]): boolean {
    return required.every((key: string): boolean => {
      return key in value;
    });
  }

  static hasNoAdditionalProperties(value: Record<string, unknown>, allowedKeys: Set<string>): boolean {
    return Object.keys(value).every((key: string): boolean => {
      return allowedKeys.has(key);
    });
  }

  static satisfiesMinProperties(value: Record<string, unknown>, minimum: number): boolean {
    return Object.keys(value).length >= minimum;
  }

  static satisfiesMaxProperties(value: Record<string, unknown>, maximum: number): boolean {
    return Object.keys(value).length <= maximum;
  }

  static #decodeBase64Safe(value: string, urlSafe: boolean): null | string {
    try {
      const normalised = urlSafe
        ? value.replaceAll('-', '+').replaceAll('_', '/')
        : value;
      const decoded = atob(normalised);

      return decoded;
    } catch {
      return null;
    }
  }

  static #isValidJson(content: string): boolean {
    try {
      JSON.parse(content);

      return true;
    } catch {
      return false;
    }
  }
}
