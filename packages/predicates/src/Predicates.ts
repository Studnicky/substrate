/** Static predicate library for JSON Schema draft 2020-12 validation. */

import { LruCache } from '@studnicky/cache';
import { DataType } from '@studnicky/json';

import type { CoerceToBooleanResultType } from './CoerceToBooleanResultType.js';
import type { CoerceToNumberResultType } from './CoerceToNumberResultType.js';

import {
  MULTIPLE_OF_EPSILON_FACTOR,
  PATTERN_CACHE_CAPACITY,
  SUPPORTED_CONTENT_ENCODINGS,
  SUPPORTED_CONTENT_MEDIA_TYPES
} from './constants/index.js';

export class Predicates {
  /** Bounded so schemas sourced from untrusted input cannot grow this cache unboundedly. */
  private static readonly patternCache = LruCache.create<string, RegExp>({
    'capacity': PATTERN_CACHE_CAPACITY
  });
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
        const result = Array.isArray(value);
        return result;
      }
    ],
    [
      'integer',
      (value: unknown): boolean => {
        const result = Predicates.isIntegerValue(value);
        return result;
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
        const result = Predicates.isFiniteNumber(value);
        return result;
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
    const strLen = str.length;

    for (let index = 0; index < strLen; index++) {
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
    const strLen = str.length;

    for (let index = 0; index < strLen; index++) {
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
    const strLen = str.length;

    for (let index = 0; index < strLen; index++) {
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

    const typesLen = schemaTypes.length;

    for (let i = 0; i < typesLen; i += 1) {
      const type = schemaTypes[i]!;
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
    const result = schemaTypes.some((schemaType: string): boolean => {
      const result = Predicates.matchesType(schemaType, value);
      return result;
    });
    return result;
  }

  static matchesType(schemaType: string, value: unknown): boolean {
    const matcher = Predicates.typeMatchers.get(schemaType);

    return matcher === undefined ? Predicates.inferValueType(value) === schemaType : matcher(value);
  }

  static satisfiesConst(value: unknown, constValue: unknown): boolean {
    const result = DataType.deepEqual(value, constValue);
    return result;
  }

  static satisfiesEnum(value: unknown, enumValues: unknown[]): boolean {
    const result = enumValues.some((enumValue: unknown): boolean => {
      const result = DataType.deepEqual(value, enumValue);
      return result;
    });
    return result;
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

    return Math.abs(quotient - Math.round(quotient)) <= Number.EPSILON * MULTIPLE_OF_EPSILON_FACTOR;
  }

  static satisfiesMultipleOf(value: number, divisor: number): boolean {
    const result = Predicates.checkMultipleOf(value, divisor);
    return result;
  }

  static checkPattern(value: string, pattern: RegExp | string): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(value);
    }

    const cached = Predicates.patternCache.get(pattern);

    if (cached !== undefined) {
      return cached.test(value);
    }

    const regex = new RegExp(pattern, 'u');
    Predicates.patternCache.set(pattern, regex);

    return regex.test(value);
  }

  /** Fast-paths: len<min→false, len>=2*min→true; walks code points only in residual band. */
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

  /** Fast-path: code_points <= utf16_length, so value.length<=max is definitely true. */
  static satisfiesMaxLength(value: string, maximum: number): boolean {
    if (value.length <= maximum) {
      return true;
    }

    return Predicates.codePointLengthAtMost(value, maximum);
  }

  static satisfiesPattern(value: string, regex: RegExp): boolean {
    const result = regex.test(value);
    return result;
  }

  /** Only base64/base64url are actively checked; unknown encodings return true per spec. */
  static satisfiesContentEncoding(value: string, encoding: string): boolean {
    if (!SUPPORTED_CONTENT_ENCODINGS.has(encoding)) {
      return true;
    }

    return Predicates.#decodeBase64Safe(value, encoding === 'base64url') !== null;
  }

  /** Only application/json is actively checked; unknown media types return true per spec. */
  static satisfiesContentMediaType(value: string, mediaType: string, encoding?: string): boolean {
    if (!SUPPORTED_CONTENT_MEDIA_TYPES.has(mediaType)) {
      return true;
    }

    let content = value;

    if (encoding !== undefined && SUPPORTED_CONTENT_ENCODINGS.has(encoding)) {
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
    const valueLen = value.length;

    for (let index = 0; index < valueLen; index++) {
      for (let other = index + 1; other < valueLen; other++) {
        if (DataType.deepEqual(value[index], value[other])) {
          return false;
        }
      }
    }

    return true;
  }

  static hasAllRequiredProperties(value: Record<string, unknown>, required: string[]): boolean {
    const result = required.every((key: string): boolean => {
      return key in value;
    });
    return result;
  }

  static hasNoAdditionalProperties(value: Record<string, unknown>, allowedKeys: Set<string>): boolean {
    const result = Object.keys(value).every((key: string): boolean => {
      const result = allowedKeys.has(key);
      return result;
    });
    return result;
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
