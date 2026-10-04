import {
  ALL_DIGITS_PATTERN,
  MULTIPLE_OF_EPSILON_FACTOR,
  REDOS_VULNERABLE_PATTERNS,
  SUPPORTED_CONTENT_ENCODINGS,
  SUPPORTED_CONTENT_MEDIA_TYPES
} from './constants/index.js';
import { CycleDetectionPredicates } from './CycleDetectionPredicates.js';

interface Uint32RangeInterface {
  readonly 'end': number
  readonly 'start': number
}

/** JSON Schema draft 2020-12 keyword predicates, plus the IPv4/CIDR and code-point utilities they share. */
export class SchemaPredicates extends CycleDetectionPredicates {
  private static readonly typeMatchers = new Map<string, (value: unknown) => boolean>([
    [
      'array',
      Array.isArray
    ],
    [
      'integer',
      (value: unknown): boolean => {
        const result = SchemaPredicates.isIntegerValue(value);
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
        const result = SchemaPredicates.isFiniteNumber(value);
        return result;
      }
    ],
    [
      'object',
      (value: unknown): boolean => {
        const result = SchemaPredicates.inferValueType(value) === 'object';
        return result;
      }
    ]
  ]);

  /** Checks whether an IPv4 address falls within a CIDR range. Malformed input returns `false`. */
  public static isIpInCidr(ip: string, cidr: string): boolean {
    const ipNumber = SchemaPredicates.ipv4ToUint32(ip);

    if (ipNumber === undefined) {
      return false;
    }

    const range = SchemaPredicates.parseCidrRange(cidr);

    if (range === undefined) {
      return false;
    }

    const result = ipNumber >= range.start && ipNumber <= range.end;
    return result;
  }

  /** Checks whether a regex pattern is vulnerable to ReDoS via known-catastrophic constructs. */
  public static isVulnerablePattern(pattern: string | RegExp): boolean {
    const patternSource = pattern instanceof RegExp ? pattern.source : String(pattern);

    const result = REDOS_VULNERABLE_PATTERNS.some((vulnerablePattern) => {
      const matched = vulnerablePattern.test(patternSource);
      return matched;
    });

    return result;
  }

  /**
   * Range comparison with type checking across numbers, `Date`, and strings.
   * `inclusive` selects `>=`/`<=` (in-range) vs `<`/`>` (out-of-range) semantics.
   */
  public static performRangeComparison(
    value: unknown,
    minimum: unknown,
    maximum: unknown,
    inclusive: boolean,
    options: Readonly<{ 'boundary'?: 'closed' | 'half-open', 'caseSensitive'?: boolean }> = {}
  ): boolean {
    const { boundary = 'closed', caseSensitive = true } = options;

    const numericResult = SchemaPredicates.compareNumericRange(value, minimum, maximum, inclusive, boundary);

    if (numericResult !== null) {
      return numericResult;
    }

    const dateResult = SchemaPredicates.compareDateRange(value, minimum, maximum, inclusive, boundary);

    if (dateResult !== null) {
      return dateResult;
    }

    const stringResult = SchemaPredicates.compareStringRange(value, minimum, maximum, inclusive, caseSensitive);

    if (stringResult !== null) {
      return stringResult;
    }

    const result = inclusive ? false : true;

    return result;
  }

  /** Count Unicode code points without allocating an intermediate array. */
  public static codePointLength(string: string): number {
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

  /** Infer the JSON Schema type name of a value. */
  public static inferValueType(value: unknown): string {
    if (value === null) {
      return 'null';
    }
    if (Array.isArray(value)) {
      return 'array';
    }

    const result = typeof value;
    return result;
  }

  public static matchesAnyType(schemaTypes: string[], value: unknown): boolean {
    const schemaTypeCount = schemaTypes.length;
    for (let index = 0; index < schemaTypeCount; index += 1) {
      const schemaType = schemaTypes[index]!;
      if (SchemaPredicates.matchesType(schemaType, value)) {
        return true;
      }
    }
    return false;
  }

  public static matchesType(schemaType: string, value: unknown): boolean {
    const matcher = SchemaPredicates.typeMatchers.get(schemaType);

    const result = matcher === undefined ? SchemaPredicates.inferValueType(value) === schemaType : matcher(value);
    return result;
  }

  public static checkMinimum(value: number, minimum: number, exclusive: boolean): boolean {
    const result = exclusive ? value > minimum : value >= minimum;
    return result;
  }

  public static checkMaximum(value: number, maximum: number, exclusive: boolean): boolean {
    const result = exclusive ? value < maximum : value <= maximum;
    return result;
  }

  /** Uses epsilon tolerance for floating-point rounding errors. */
  public static checkMultipleOf(value: number, divisor: number): boolean {
    if (divisor === 0) {
      return false;
    }
    const quotient = value / divisor;

    const result = Math.abs(quotient - Math.round(quotient)) <= Number.EPSILON * MULTIPLE_OF_EPSILON_FACTOR;
    return result;
  }

  public static checkPattern(value: string, pattern: RegExp): boolean {
    pattern.lastIndex = 0;
    const result = pattern.test(value);
    pattern.lastIndex = 0;

    return result;
  }

  /** Fast-paths: len<min→false, len>=2*min→true; walks code points only in residual band. */
  public static satisfiesMinimumLength(value: string, minimum: number): boolean {
    const length = value.length;

    if (length < minimum) {
      return false;
    }
    if (length >= minimum * 2) {
      return true;
    }

    const result = SchemaPredicates.codePointLengthAtLeast(value, minimum);
    return result;
  }

  /** Fast-path: code_points <= utf16_length, so value.length<=max is definitely true. */
  public static satisfiesMaximumLength(value: string, maximum: number): boolean {
    if (value.length <= maximum) {
      return true;
    }

    const result = SchemaPredicates.codePointLengthAtMost(value, maximum);
    return result;
  }

  /** Only base64/base64url are actively checked; unknown encodings return true per spec. */
  public static satisfiesContentEncoding(value: string, encoding: string): boolean {
    if (!SUPPORTED_CONTENT_ENCODINGS.has(encoding)) {
      return true;
    }

    const result = SchemaPredicates.decodeBase64Safe(value, encoding === 'base64url') !== null;
    return result;
  }

  /** Only application/json is actively checked; unknown media types return true per spec. */
  public static satisfiesContentMediaType(value: string, mediaType: string, encoding?: string): boolean {
    if (!SUPPORTED_CONTENT_MEDIA_TYPES.has(mediaType)) {
      return true;
    }

    let content = value;

    if (encoding !== undefined && SUPPORTED_CONTENT_ENCODINGS.has(encoding)) {
      const decoded = SchemaPredicates.decodeBase64Safe(value, encoding === 'base64url');

      if (decoded === null) {
        return false;
      }

      content = decoded;
    }

    if (mediaType === 'application/json') {
      const result = SchemaPredicates.isValidJson(content);
      return result;
    }

    return true;
  }

  /** Validates minContains/maxContains bounds against match count from a contains schema. */
  public static satisfiesContains(
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

  public static satisfiesMinimumItems(value: unknown[], minimum: number): boolean {
    const result = value.length >= minimum;
    return result;
  }

  public static satisfiesMaximumItems(value: unknown[], maximum: number): boolean {
    const result = value.length <= maximum;
    return result;
  }

  /** Checks own properties only; inherited keys (e.g. from the prototype chain) never satisfy `required`. */
  public static hasAllRequiredProperties(value: Record<string, unknown>, required: string[]): boolean {
    const requiredCount = required.length;
    for (let index = 0; index < requiredCount; index += 1) {
      const key = required[index]!;
      if (!Object.hasOwn(value, key)) {
        return false;
      }
    }
    return true;
  }

  public static hasNoAdditionalProperties(value: Record<string, unknown>, allowedKeys: Set<string>): boolean {
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

  public static satisfiesMinimumProperties(value: Record<string, unknown>, minimum: number): boolean {
    const result = Object.keys(value).length >= minimum;
    return result;
  }

  public static satisfiesMaximumProperties(value: Record<string, unknown>, maximum: number): boolean {
    const result = Object.keys(value).length <= maximum;
    return result;
  }

  /** Checks if all values are numbers and performs numeric range comparison. */
  private static compareNumericRange(value: unknown, minimum: unknown, maximum: unknown, inclusive: boolean, boundary: 'closed' | 'half-open'): boolean | null {
    if (typeof value === 'number' && typeof minimum === 'number' && typeof maximum === 'number') {
      const inRange = boundary === 'half-open'
        ? value >= minimum && value < maximum
        : value >= minimum && value <= maximum;

      const result = inclusive ? inRange : !inRange;
      return result;
    }

    return null;
  }

  /** Checks if all values are Dates and performs date range comparison. */
  private static compareDateRange(value: unknown, minimum: unknown, maximum: unknown, inclusive: boolean, boundary: 'closed' | 'half-open'): boolean | null {
    if (value instanceof Date && minimum instanceof Date && maximum instanceof Date) {
      const valueTime = value.getTime();
      const minimumTime = minimum.getTime();
      const maximumTime = maximum.getTime();

      const inRange = boundary === 'half-open'
        ? valueTime >= minimumTime && valueTime < maximumTime
        : valueTime >= minimumTime && valueTime <= maximumTime;

      const result = inclusive ? inRange : !inRange;
      return result;
    }

    return null;
  }

  /** Checks if all values are strings and performs lexicographic range comparison. */
  private static compareStringRange(value: unknown, minimum: unknown, maximum: unknown, inclusive: boolean, caseSensitive: boolean): boolean | null {
    if (typeof value === 'string' && typeof minimum === 'string' && typeof maximum === 'string') {
      const comparisonValue = caseSensitive ? value : value.toLowerCase();
      const comparisonMinimum = caseSensitive ? minimum : minimum.toLowerCase();
      const comparisonMaximum = caseSensitive ? maximum : maximum.toLowerCase();

      const result = inclusive
        ? comparisonValue >= comparisonMinimum && comparisonValue <= comparisonMaximum
        : comparisonValue < comparisonMinimum || comparisonValue > comparisonMaximum;

      return result;
    }

    return null;
  }

  /** Converts an IPv4 dotted-decimal string to its 32-bit unsigned integer representation, or `undefined` when malformed. */
  public static ipv4ToUint32(ip: string): number | undefined {
    const parts = ip.trim().split('.');

    if (parts.length !== 4) {
      return undefined;
    }

    let accumulator = 0;

    for (let index = 0; index < parts.length; index++) {
      const octet = parts[index]!;

      if (!ALL_DIGITS_PATTERN.test(octet)) {
        return undefined;
      }

      const number = Number.parseInt(octet, 10);

      if (number > 255) {
        return undefined;
      }
      accumulator = (accumulator << 8) + number;
    }

    const result = accumulator >>> 0;
    return result;
  }

  /** Parses CIDR notation into its inclusive `[start, end]` IPv4 range, or `undefined` when malformed. */
  public static parseCidrRange(cidr: string): Uint32RangeInterface | undefined {
    const parts = cidr.trim().split('/');

    if (parts.length !== 2) {
      return undefined;
    }

    const ipPart = parts[0];
    const prefixPart = parts[1];

    if (ipPart === undefined || prefixPart === undefined) {
      return undefined;
    }

    const ip = SchemaPredicates.ipv4ToUint32(ipPart);

    if (ip === undefined) {
      return undefined;
    }

    if (!ALL_DIGITS_PATTERN.test(prefixPart)) {
      return undefined;
    }

    const prefix = Number.parseInt(prefixPart, 10);

    if (prefix > 32) {
      return undefined;
    }

    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const start = (ip & mask) >>> 0;
    const end = (start | (~mask >>> 0)) >>> 0;

    return {
      'end': end,
      'start': start
    };
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

  private static decodeBase64Safe(value: string, urlSafe: boolean): null | string {
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

  private static isValidJson(content: string): boolean {
    try {
      JSON.parse(content);

      return true;
    } catch {
      return false;
    }
  }
}
