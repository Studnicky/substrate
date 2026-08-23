/** Static predicate library for JSON Schema draft 2020-12 validation. */

import { DataType } from '@studnicky/json';

import {
  MULTIPLE_OF_EPSILON_FACTOR,
  SUPPORTED_CONTENT_ENCODINGS,
  SUPPORTED_CONTENT_MEDIA_TYPES
} from './constants/index.js';

export class Predicates {
  private static readonly coercionHandlers = new Map<string, (value: unknown) => unknown>([
    [
      'array',
      (value: unknown): unknown => {
        const result = !Array.isArray(value) && typeof value !== 'object' ? [value] : value;
        return result;
      }
    ],
    [
      'boolean',
      (value: unknown): unknown => {
        if (typeof value === 'string') {
          const result = Predicates.coerceToBoolean(value) ?? value;
          return result;
        }
        if (value === 1) {
          const result = true;
          return result;
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

          const result = coerced === undefined ? value : Math.trunc(coerced);
          return result;
        }
        if (typeof value === 'boolean') {
          const result = value ? 1 : 0;
          return result;
        }

        return value;
      }
    ],
    [
      'null',
      (value: unknown): unknown => {
        const result = value === '' || value === 'null' ? null : value;
        return result;
      }
    ],
    [
      'number',
      (value: unknown): unknown => {
        if (typeof value === 'string') {
          const result = Predicates.coerceToNumber(value) ?? value;
          return result;
        }
        if (typeof value === 'boolean') {
          const result = value ? 1 : 0;
          return result;
        }

        return value;
      }
    ],
    [
      'string',
      (value: unknown): unknown => {
        const result = typeof value === 'string' ? value : String(value);
        return result;
      }
    ]
  ]);

  private static readonly typeMatchers = new Map<string, (value: unknown) => boolean>([
    [
      'array',
      Array.isArray
    ],
    [
      'integer',
      (value: unknown): boolean => {
        const result = typeof value === 'number' && Number.isInteger(value);
        return result;
      }
    ],
    [
      'null',
      (value: unknown): boolean => {
        const result = value === null;
        return result;
      }
    ],
    [
      'number',
      (value: unknown): boolean => {
        const result = typeof value === 'number' && Number.isFinite(value);
        return result;
      }
    ],
    [
      'object',
      (value: unknown): boolean => {
        const result = Predicates.inferValueType(value) === 'object';
        return result;
      }
    ]
  ]);

  /** Count Unicode code points without allocating an intermediate array. */
  static codePointLength(string: string): number {
    let length = 0;
    const stringLength = string.length;

    for (let index = 0; index < stringLength; index++) {
      length++;
      const code = string.codePointAt(index);

      if (code !== undefined && code > 0xFF_FF) {
        index++;
      }
    }

    return length;
  }

  /** Returns true as soon as `target` code points have been counted; stops early. */
  private static codePointLengthAtLeast(string: string, target: number): boolean {
    let count = 0;
    const stringLength = string.length;

    for (let index = 0; index < stringLength; index++) {
      count++;
      if (count >= target) {
        return true;
      }
      const code = string.codePointAt(index);

      if (code !== undefined && code > 0xFF_FF) {
        index++;
      }
    }

    const result = count >= target;
    return result;
  }

  /** Returns false as soon as code-point count exceeds `limit`; stops early. */
  private static codePointLengthAtMost(string: string, limit: number): boolean {
    let count = 0;
    const stringLength = string.length;

    for (let index = 0; index < stringLength; index++) {
      count++;
      if (count > limit) {
        return false;
      }
      const code = string.codePointAt(index);

      if (code !== undefined && code > 0xFF_FF) {
        index++;
      }
    }

    return true;
  }

  /** Coerce string to boolean; returns true/false for recognised literals, undefined otherwise. */
  static coerceToBoolean(value: string): boolean | undefined {
    if (value === 'true' || value === '1') {
      return true;
    }
    if (value === 'false' || value === '0') {
      return false;
    }

    return undefined;
  }

  /** Coerce string to finite number; returns undefined for Infinity, NaN, or non-numeric. */
  static coerceToNumber(value: string): number | undefined {
    const coerced = Number(value);

    const result = Number.isFinite(coerced) ? coerced : undefined;
    return result;
  }

  /** Attempt coercion in schema-type order; returns first successful result or original value. */
  static coerceValue(schemaTypes: string[], value: unknown): unknown {
    if (value === undefined || value === null || schemaTypes.length === 0) {
      return value;
    }

    const schemaTypeCount = schemaTypes.length;

    for (let i = 0; i < schemaTypeCount; i += 1) {
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

    const result = typeof value;
    return result;
  }

  static isFiniteNumber(value: unknown): boolean {
    const result = typeof value === 'number' && Number.isFinite(value);
    return result;
  }

  static isIntegerValue(value: unknown): boolean {
    const result = typeof value === 'number' && Number.isInteger(value);
    return result;
  }

  static matchesAnyType(schemaTypes: string[], value: unknown): boolean {
    const schemaTypeCount = schemaTypes.length;
    for (let index = 0; index < schemaTypeCount; index += 1) {
      const schemaType = schemaTypes[index]!;
      if (Predicates.matchesType(schemaType, value)) {
        return true;
      }
    }
    return false;
  }

  static matchesType(schemaType: string, value: unknown): boolean {
    const matcher = Predicates.typeMatchers.get(schemaType);

    const result = matcher === undefined ? Predicates.inferValueType(value) === schemaType : matcher(value);
    return result;
  }

  static satisfiesEnum(value: unknown, enumValues: unknown[]): boolean {
    const enumValueCount = enumValues.length;
    for (let index = 0; index < enumValueCount; index += 1) {
      const enumValue = enumValues[index];
      if (DataType.deepEqual(value, enumValue)) {
        return true;
      }
    }
    return false;
  }

  static checkMinimum(value: number, minimum: number, exclusive: boolean): boolean {
    const result = exclusive ? value > minimum : value >= minimum;
    return result;
  }

  static checkMaximum(value: number, maximum: number, exclusive: boolean): boolean {
    const result = exclusive ? value < maximum : value <= maximum;
    return result;
  }

  /** Uses epsilon tolerance for floating-point rounding errors. */
  static checkMultipleOf(value: number, divisor: number): boolean {
    if (divisor === 0) {
      return false;
    }
    const quotient = value / divisor;

    const result = Math.abs(quotient - Math.round(quotient)) <= Number.EPSILON * MULTIPLE_OF_EPSILON_FACTOR;
    return result;
  }

  static checkPattern(value: string, pattern: RegExp): boolean {
    pattern.lastIndex = 0;
    const result = pattern.test(value);
    pattern.lastIndex = 0;

    return result;
  }

  /** Fast-paths: len<min→false, len>=2*min→true; walks code points only in residual band. */
  static satisfiesMinimumLength(value: string, minimum: number): boolean {
    const length = value.length;

    if (length < minimum) {
      return false;
    }
    if (length >= minimum * 2) {
      return true;
    }

    const result = Predicates.codePointLengthAtLeast(value, minimum);
    return result;
  }

  /** Fast-path: code_points <= utf16_length, so value.length<=max is definitely true. */
  static satisfiesMaximumLength(value: string, maximum: number): boolean {
    if (value.length <= maximum) {
      return true;
    }

    const result = Predicates.codePointLengthAtMost(value, maximum);
    return result;
  }

  /** Only base64/base64url are actively checked; unknown encodings return true per spec. */
  static satisfiesContentEncoding(value: string, encoding: string): boolean {
    if (!SUPPORTED_CONTENT_ENCODINGS.has(encoding)) {
      return true;
    }

    const result = Predicates.#decodeBase64Safe(value, encoding === 'base64url') !== null;
    return result;
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
      const result = Predicates.#isValidJson(content);
      return result;
    }

    return true;
  }

  /** Validates minContains/maxContains bounds against match count from a contains schema. */
  static satisfiesContains(
    matchCount: number,
    options: Readonly<{ 'maximumContains'?: number | undefined; 'minimumContains'?: number | undefined }> = {}
  ): boolean {
    const { maximumContains, minimumContains } = options;
    const minimum = minimumContains ?? (maximumContains === undefined ? 1 : 0);

    if (matchCount < minimum) {
      return false;
    }
    if (maximumContains !== undefined && matchCount > maximumContains) {
      return false;
    }

    return true;
  }

  static satisfiesMinimumItems(value: unknown[], minimum: number): boolean {
    const result = value.length >= minimum;
    return result;
  }

  static satisfiesMaximumItems(value: unknown[], maximum: number): boolean {
    const result = value.length <= maximum;
    return result;
  }

  static satisfiesUniqueItems(value: unknown[]): boolean {
    const valueLength = value.length;

    for (let index = 0; index < valueLength; index++) {
      for (let other = index + 1; other < valueLength; other++) {
        if (DataType.deepEqual(value[index], value[other])) {
          return false;
        }
      }
    }

    return true;
  }

  /** Checks own properties only; inherited keys (e.g. from the prototype chain) never satisfy `required`. */
  static hasAllRequiredProperties(value: Record<string, unknown>, required: string[]): boolean {
    const requiredCount = required.length;
    for (let index = 0; index < requiredCount; index += 1) {
      const key = required[index]!;
      if (!Object.hasOwn(value, key)) {
        return false;
      }
    }
    return true;
  }

  static hasNoAdditionalProperties(value: Record<string, unknown>, allowedKeys: Set<string>): boolean {
    const keys = Object.keys(value);
    const keyCount = keys.length;
    for (let index = 0; index < keyCount; index += 1) {
      const key = keys[index]!;
      if (!allowedKeys.has(key)) {
        return false;
      }
    }
    return true;
  }

  static satisfiesMinimumProperties(value: Record<string, unknown>, minimum: number): boolean {
    const result = Object.keys(value).length >= minimum;
    return result;
  }

  static satisfiesMaximumProperties(value: Record<string, unknown>, maximum: number): boolean {
    const result = Object.keys(value).length <= maximum;
    return result;
  }

  static #decodeBase64Safe(value: string, urlSafe: boolean): null | string {
    try {
      const normalised = urlSafe
        ? value.replaceAll('-', '+').replaceAll('_', '/')
        : value;
      const decoded = atob(normalised);

      const result = decoded;
      return result;
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
