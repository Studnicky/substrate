import { CycleDetectionPredicates } from './CycleDetectionPredicates.js';
import { DateSemverPredicates } from './DateSemverPredicates.js';
import { RuntimeValuePredicates } from './RuntimeValuePredicates.js';
import { SchemaPredicates } from './SchemaPredicates.js';
import { TypeGuardPredicates } from './TypeGuardPredicates.js';

/**
 * Type-safe accessors, type guards, atomic value comparators, and JSON Schema
 * draft 2020-12 predicates, unified on one static class.
 *
 * Static methods on `Predicates` narrow `unknown` values to concrete types without
 * unsafe assertions, compare values for equality, and evaluate JSON Schema
 * keyword predicates. Use these when processing external API responses, any
 * dynamically-typed payload where the shape is not yet known, comparator/operator
 * logic, or schema validation.
 *
 * Every method below is declared directly on `Predicates` (not inherited) so its
 * signature stays portable in downstream `.d.ts` emit; the body delegates to a
 * cohesive internal implementation class (`TypeGuardPredicates`, `DateSemverPredicates`,
 * `RuntimeValuePredicates`, `CycleDetectionPredicates`, `SchemaPredicates`).
 *
 * Extend `Predicates` and `static override isObject` to customise record detection;
 * `asRecordArray` delegates through `this.isObject` so overrides propagate.
 */
export class Predicates {
  /** Returns the value as `number` when it is a number, otherwise returns `undefined`. */
  public static readonly asNumber: (value: unknown) => number | undefined = TypeGuardPredicates.asNumber;

  /** Returns the value as a finite `number`, coercing a non-empty numeric string. */
  public static readonly asStrictNumber: (value: unknown) => number | undefined = TypeGuardPredicates.asStrictNumber;

  /** Returns the value as `string | null` when it is a string or `null`, otherwise `undefined`. */
  public static readonly asStringOrNull: (value: unknown) => string | null | undefined = TypeGuardPredicates.asStringOrNull;

  /**
   * Returns an array of `Record<string, unknown>` entries from an array
   * value, filtering out any non-record elements. Returns `undefined` when
   * `value` is not an array or when no records are found.
   *
   * Delegates record-detection to `this.isObject` so subclass static overrides
   * propagate.
   */
  public static asRecordArray(value: unknown): Record<string, unknown>[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const result: Record<string, unknown>[] = [];
    const length = value.length;

    for (let index = 0; index < length; index += 1) {
      const item: unknown = value[index];
      if (this.isObject(item)) {
        result.push(item);
      }
    }

    const recordArray = result.length > 0 ? result : undefined;
    return recordArray;
  }

  public static readonly isString: <T>(value: T) => value is string & T = TypeGuardPredicates.isString;

  public static readonly isNumber: <T>(value: T) => value is number & T = TypeGuardPredicates.isNumber;

  /**
   * Type guard for the `number` primitive, including `NaN` and `±Infinity`.
   * Use this over `isNumber` when the caller needs to route those values to
   * a more specific downstream check rather than reject them at the type gate.
   */
  public static readonly isNumberType: <T>(value: T) => value is number & T = TypeGuardPredicates.isNumberType;

  public static readonly isBoolean: <T>(value: T) => value is boolean & T = TypeGuardPredicates.isBoolean;

  public static readonly isFunction: {
    <T extends (...argumentList: unknown[]) => unknown>(value: T): value is T;
    (value: unknown): value is (...argumentList: unknown[]) => unknown;
  } = TypeGuardPredicates.isFunction;

  /** `isObjectLike` or `isFunction` — the shape a `WeakMap`-tracked reference cycle guard accepts. */
  public static readonly isObjectLikeOrFunction: <T>(value: T) => value is object & T = TypeGuardPredicates.isObjectLikeOrFunction;

  /**
   * Returns `true` when `value` is any non-null object — including an array, `Map`, `Set`, or a
   * class instance of unknown provenance. Use `isObject` instead when the code goes on to do
   * bracket-property access and genuinely needs to exclude `Array`/`Map`/`Set`.
   */
  public static readonly isObjectLike: <T>(value: T) => value is object & T = TypeGuardPredicates.isObjectLike;

  /**
   * Returns `true` when `value` is a plain, non-null, non-array object.
   * `Map` and `Set` instances return `false` — a `Record<string, unknown>`
   * must support bracket-property access, which neither collection provides.
   * This is the canonical plain-object check for the package: `JsonObject.is`
   * delegates here rather than reimplementing the exclusion. `asRecordArray`
   * delegates here too; static override this method in a subclass to
   * customise what counts as a record.
   */
  public static isObject<T>(value: T): value is Record<string, unknown> & T {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }
    const result = !(value instanceof Map) && !(value instanceof Set);
    return result;
  }

  /** Type guard for a `Map` instance. */
  public static readonly isMap: <T>(value: T) => value is Map<unknown, unknown> & T = TypeGuardPredicates.isMap;

  /** Type guard for a `Set` instance. */
  public static readonly isSet: <T>(value: T) => value is Set<unknown> & T = TypeGuardPredicates.isSet;

  /** Type guard for a `Date` instance. */
  public static readonly isDate: <T>(value: T) => value is Date & T = TypeGuardPredicates.isDate;

  /** Type guard for an array — `Array.isArray` narrowed to `readonly unknown[]`. */
  public static readonly isArray: <T>(value: T) => value is readonly unknown[] & T = TypeGuardPredicates.isArray;

  /**
   * Returns `true` when `value` is a non-null, non-array object of ANY prototype — a `Map`, a
   * `Set`, or a class instance all pass. Broader than `isObject` (which additionally excludes
   * `Map`/`Set`) and looser than `isPlainObject` (which additionally requires
   * `Object.prototype`/`null` as the prototype).
   */
  public static readonly isRecord: <T>(value: T) => value is Record<string, unknown> & T = TypeGuardPredicates.isRecord;

  /**
   * Returns `true` when `value` is a plain object — non-null, non-array, and its prototype is
   * exactly `Object.prototype` or `null`. Stricter than `isObject`: a class instance (custom
   * prototype) fails this even though it passes `isObject`.
   */
  public static readonly isPlainObject: <T>(value: T) => value is Record<string, unknown> & T = TypeGuardPredicates.isPlainObject;

  /** Type guard for `null` or `undefined`. */
  public static readonly isNullish: <T>(value: T) => value is (null | undefined) & T = TypeGuardPredicates.isNullish;

  /** Type guard for a `RegExp` instance. */
  public static readonly isRegExp: <T>(value: T) => value is RegExp & T = TypeGuardPredicates.isRegExp;

  /** Type guard for a `symbol`. */
  public static readonly isSymbol: <T>(value: T) => value is symbol & T = TypeGuardPredicates.isSymbol;

  /** Type guard for a `bigint`. */
  public static readonly isBigInt: <T>(value: T) => value is bigint & T = TypeGuardPredicates.isBigInt;

  /**
   * Type guard for a thenable — an object or function exposing a callable `.then`. Node's own
   * `Promise.resolve` uses exactly this duck-type check (not `instanceof Promise`) to decide
   * whether to adopt a value's resolution, which is why this checks structure rather than class.
   */
  public static readonly isThenable: <T>(value: T) => value is PromiseLike<unknown> & T = TypeGuardPredicates.isThenable;

  /** Type guard for a value implementing the iterable protocol (`Symbol.iterator`). */
  public static readonly isIterable: <T>(value: T) => value is Iterable<unknown> & T = TypeGuardPredicates.isIterable;

  /** Type guard for a value implementing the async-iterable protocol (`Symbol.asyncIterator`). */
  public static readonly isAsyncIterable: <T>(value: T) => value is AsyncIterable<unknown> & T = TypeGuardPredicates.isAsyncIterable;

  /** Type guard for a typed array or `DataView` over an `ArrayBuffer`. */
  public static readonly isArrayBufferView: <T>(value: T) => value is ArrayBufferView & T = TypeGuardPredicates.isArrayBufferView;

  /** Type guard for a `Blob` instance (a `File` is a `Blob`, so this accepts both). */
  public static readonly isBlob: <T>(value: T) => value is Blob & T = TypeGuardPredicates.isBlob;

  /** Type guard for a `FormData` instance. */
  public static readonly isFormData: <T>(value: T) => value is FormData & T = TypeGuardPredicates.isFormData;

  /** Type guard for a `URL` instance. */
  public static readonly isURL: <T>(value: T) => value is T & URL = TypeGuardPredicates.isURL;

  /** Type guard for a `URLSearchParams` instance. */
  public static readonly isURLSearchParams: <T>(value: T) => value is T & URLSearchParams = TypeGuardPredicates.isURLSearchParams;

  /** Type guard for a `Headers` instance. */
  public static readonly isHeaders: <T>(value: T) => value is Headers & T = TypeGuardPredicates.isHeaders;

  /** Type guard for a `Request` instance. */
  public static readonly isRequest: <T>(value: T) => value is Request & T = TypeGuardPredicates.isRequest;

  /** Type guard for a `Response` instance. */
  public static readonly isResponse: <T>(value: T) => value is Response & T = TypeGuardPredicates.isResponse;

  /** Type guard for an `AbortSignal` instance. */
  public static readonly isAbortSignal: <T>(value: T) => value is AbortSignal & T = TypeGuardPredicates.isAbortSignal;

  /** Type guard for a `ReadableStream` instance. */
  public static readonly isReadableStream: <T>(value: T) => value is ReadableStream & T = TypeGuardPredicates.isReadableStream;

  /**
   * Type guard for a real `Error` instance, including cross-realm errors. Delegates to
   * `Error.isError`, the runtime's own answer to that question, rather than a hand-rolled
   * `instanceof Error` check.
   */
  public static readonly isError: <T>(value: T) => value is Error & T = TypeGuardPredicates.isError;

  /** Type guard for non-negative integers (>= 0). */
  public static readonly isNonNegativeInteger: <T>(value: T) => value is number & T = TypeGuardPredicates.isNonNegativeInteger;

  /** Type guard for positive integers (> 0). */
  public static readonly isPositiveInteger: <T>(value: T) => value is number & T = TypeGuardPredicates.isPositiveInteger;

  /**
   * Returns true when two supported runtime values have the same structure. Primitive values
   * use Object.is semantics, so NaN equals NaN and -0 differs from +0. Object graphs retain
   * reference topology: a self-reference does not equal a two-node cycle.
   */
  public static readonly areDeeplyEqual: (value: unknown, filterValue: unknown) => boolean = RuntimeValuePredicates.areDeeplyEqual;

  /**
   * Returns true when an object graph contains a reference cycle.
   * Arrays, Maps (keys and values), Sets, and the enumerable own properties of every other
   * object-like value are traversed recursively.
   */
  public static readonly hasCycle: (value: unknown) => boolean = CycleDetectionPredicates.hasCycle;

  /** `NaN` comparison for deep equality — `NaN` is considered equal to `NaN`. */
  public static readonly areNaNEqual: (value: unknown, filterValue: unknown) => boolean = RuntimeValuePredicates.areNaNEqual;

  /** `NaN` comparison for strict equality — `NaN` is never equal to anything, including itself. */
  public static readonly areNaNStrict: (value: unknown, filterValue: unknown) => boolean = RuntimeValuePredicates.areNaNStrict;

  /** Checks two values are not strictly equal using `Object.is` semantics. */
  public static readonly areNotStrictlyEqual: (value: unknown, filterValue: unknown) => boolean = RuntimeValuePredicates.areNotStrictlyEqual;

  /** Checks null/undefined equality — `null`/`undefined` are only equal to themselves. */
  public static readonly areNullUndefinedEqual: (value: unknown, filterValue: unknown) => boolean = RuntimeValuePredicates.areNullUndefinedEqual;

  /** Object comparison using reference equality — `Date`/`RegExp`/array instances included. */
  public static readonly areObjectsReferenceEqual: (value: unknown, filterValue: unknown) => boolean = RuntimeValuePredicates.areObjectsReferenceEqual;

  /** Reference equality using `Object.is` semantics — correct for `NaN` and `-0`/`+0`. */
  public static readonly areReferenceEqual: (value: unknown, filterValue: unknown) => boolean = RuntimeValuePredicates.areReferenceEqual;

  /** Case-sensitive or case-insensitive string comparison via a supplied `operation`. */
  public static readonly areStringsMatching: (
    value: string,
    filterValue: string,
    options: Readonly<{ 'caseSensitive'?: boolean; 'lowerValue'?: string }>,
    operation: (firstValue: string, secondValue: string) => boolean
  ) => boolean = RuntimeValuePredicates.areStringsMatching;

  /** Validates that both values are strings. */
  public static readonly areStringsValid: <T>(value: T, filterValue: unknown) => value is string & T = RuntimeValuePredicates.areStringsValid;

  /** Checks two values share the same `typeof` result. */
  public static readonly areTypesSame: (value: unknown, filterValue: unknown) => boolean = RuntimeValuePredicates.areTypesSame;

  /** Checks two values are instances of the same constructor. */
  public static readonly areInstancesOf: <T>(
    value: unknown,
    filterValue: unknown,
    constructor: new (...constructorArguments: unknown[]) => T
  ) => value is T = RuntimeValuePredicates.areInstancesOf;

  /** Checks whether a record has a specific own property. */
  public static readonly doesObjectContainProperty: (candidate: unknown, propertyName: string) => boolean = TypeGuardPredicates.doesObjectContainProperty;

  /** Checks whether a value is a string containing only letters and numbers. */
  public static readonly isAlphanumeric: (value: unknown) => boolean = TypeGuardPredicates.isAlphanumeric;

  /** Checks whether an array has a specific length. */
  public static readonly isArrayLength: (array: unknown, expectedLength: unknown) => boolean = TypeGuardPredicates.isArrayLength;

  /** Checks whether a numeric value is close to another within a decimal precision (default 2). */
  public static readonly isCloseTo: (value: unknown, expected: unknown, precision?: number) => boolean = TypeGuardPredicates.isCloseTo;

  /**
   * Checks whether a value is date-like: a `Date` instance (even an invalid one), a numeric
   * timestamp within 1990-2100, a time-only string (`HH:MM`/`HH:MM:SS`), or a parseable date string.
   */
  public static readonly isDateLike: (value: unknown) => boolean = DateSemverPredicates.isDateLike;

  /** Checks whether a value is defined (not `undefined`). */
  public static readonly isDefined: (value: unknown) => boolean = TypeGuardPredicates.isDefined;

  /** Checks whether an array is empty. */
  public static readonly isEmptyArray: (value: unknown) => boolean = TypeGuardPredicates.isEmptyArray;

  /** Checks whether a `Map` is empty. */
  public static readonly isEmptyMap: (value: unknown) => boolean = TypeGuardPredicates.isEmptyMap;

  /** Checks whether a value is a plain object with no enumerable properties. */
  public static readonly isEmptyPlainObject: (value: unknown) => boolean = TypeGuardPredicates.isEmptyPlainObject;

  /** Checks whether a `RegExp` has an empty pattern (`(?:)`). */
  public static readonly isEmptyRegExp: (value: unknown) => boolean = TypeGuardPredicates.isEmptyRegExp;

  /** Checks whether a `Set` is empty. */
  public static readonly isEmptySet: (value: unknown) => boolean = TypeGuardPredicates.isEmptySet;

  /** Checks whether a string is empty. */
  public static readonly isEmptyString: (value: unknown) => boolean = TypeGuardPredicates.isEmptyString;

  /** Checks whether a typed array has length 0. */
  public static readonly isEmptyTypedArray: (value: unknown) => boolean = TypeGuardPredicates.isEmptyTypedArray;

  /** Checks whether a number is even. */
  public static readonly isEven: (value: unknown) => boolean = TypeGuardPredicates.isEven;

  /** Checks whether a value is strictly `false`. */
  public static readonly isFalse: (value: unknown) => boolean = TypeGuardPredicates.isFalse;

  /** Checks whether a value is falsy in boolean context. */
  public static readonly isFalsy: (value: unknown) => boolean = TypeGuardPredicates.isFalsy;

  /** Checks whether a value is a finite number (not `Infinity`, `-Infinity`, or `NaN`). */
  public static readonly isFiniteNumber: <T>(value: T) => value is number & T = TypeGuardPredicates.isFiniteNumber;

  /** Checks whether a value is greater than another — supports numbers, strings, and `Date`. */
  public static readonly isGreaterThan: (value: unknown, comparison: unknown) => boolean = TypeGuardPredicates.isGreaterThan;

  /** Checks whether a value is greater than or equal to another — numbers, strings, `Date`. */
  public static readonly isGreaterThanOrEqual: (value: unknown, comparison: unknown) => boolean = TypeGuardPredicates.isGreaterThanOrEqual;

  /** Checks whether a value is an instance of the given constructor. */
  public static isInstanceOf<Instance>(value: unknown, constructor: Function & { readonly 'prototype': Instance }): value is Instance {
    const result = TypeGuardPredicates.isInstanceOf(value, constructor);
    return result;
  }

  /** Checks whether a value is an integer. */
  public static readonly isIntegerValue: (value: unknown) => boolean = TypeGuardPredicates.isIntegerValue;

  /** Checks whether a value is less than another — supports numbers, strings, and `Date`. */
  public static readonly isLessThan: (value: unknown, comparison: unknown) => boolean = TypeGuardPredicates.isLessThan;

  /** Checks whether a value is less than or equal to another — numbers, strings, `Date`. */
  public static readonly isLessThanOrEqual: (value: unknown, comparison: unknown) => boolean = TypeGuardPredicates.isLessThanOrEqual;

  /** Checks whether a number is negative (< 0). */
  public static readonly isNegative: (value: unknown) => boolean = TypeGuardPredicates.isNegative;

  /** Checks whether a value is not `null`. */
  public static readonly isNotNull: (value: unknown) => boolean = TypeGuardPredicates.isNotNull;

  /** Checks whether a value is `null`. */
  public static readonly isNull: (value: unknown) => boolean = TypeGuardPredicates.isNull;

  /** Checks whether an object has exactly the specified number of own enumerable properties. */
  public static readonly isObjectPropertyCount: (object: unknown, expectedCount: unknown) => boolean = TypeGuardPredicates.isObjectPropertyCount;

  /** Checks whether a number is odd. */
  public static readonly isOdd: (value: unknown) => boolean = TypeGuardPredicates.isOdd;

  /** Checks whether a number is positive (> 0). */
  public static readonly isPositive: (value: unknown) => boolean = TypeGuardPredicates.isPositive;

  /** Checks whether a value is a `Promise` or a thenable object — plain `boolean`. */
  public static readonly isPromise: (value: unknown) => boolean = TypeGuardPredicates.isPromise;

  /** Checks whether a value is a two-element array (a `[minimum, maximum]` range tuple). */
  public static readonly isRangeValid: <T>(range: T) => range is readonly unknown[] & T = TypeGuardPredicates.isRangeValid;

  /** Checks whether a value is a string of the specified length. */
  public static readonly isStringLength: (value: unknown, length: number) => boolean = TypeGuardPredicates.isStringLength;

  /** Checks whether a value is strictly `true`. */
  public static readonly isTrue: (value: unknown) => boolean = TypeGuardPredicates.isTrue;

  /** Checks whether a value is truthy in boolean context. */
  public static readonly isTruthy: (value: unknown) => boolean = TypeGuardPredicates.isTruthy;

  /** Checks whether `typeof value` equals the given type string. */
  public static readonly isTypeOf: (value: unknown, type: string) => boolean = TypeGuardPredicates.isTypeOf;

  /** Checks whether a value is `undefined`. */
  public static readonly isUndefined: (value: unknown) => boolean = TypeGuardPredicates.isUndefined;

  /**
   * Compares two semantic version strings by major, minor, patch, then prerelease. A malformed
   * version sorts after a well-formed one; two malformed versions compare equal.
   */
  public static readonly compareSemverVersions: (first: string, second: string) => number = DateSemverPredicates.compareSemverVersions;

  /** Checks whether an IPv4 address falls within a CIDR range. Malformed input returns `false`. */
  public static readonly isIpInCidr: (ip: string, cidr: string) => boolean = SchemaPredicates.isIpInCidr;

  /** Checks whether a regex pattern is vulnerable to ReDoS via known-catastrophic constructs. */
  public static readonly isVulnerablePattern: (pattern: string | RegExp) => boolean = SchemaPredicates.isVulnerablePattern;

  /**
   * Range comparison with type checking across numbers, `Date`, and strings.
   * `inclusive` selects `>=`/`<=` (in-range) vs `<`/`>` (out-of-range) semantics.
   */
  public static readonly performRangeComparison: (
    value: unknown,
    minimum: unknown,
    maximum: unknown,
    inclusive: boolean,
    options?: Readonly<{ 'boundary'?: 'closed' | 'half-open', 'caseSensitive'?: boolean }>
  ) => boolean = SchemaPredicates.performRangeComparison;

  /** Count Unicode code points without allocating an intermediate array. */
  public static readonly codePointLength: (string: string) => number = SchemaPredicates.codePointLength;

  /** Infer the JSON Schema type name of a value. */
  public static readonly inferValueType: (value: unknown) => string = SchemaPredicates.inferValueType;

  public static readonly matchesAnyType: (schemaTypes: string[], value: unknown) => boolean = SchemaPredicates.matchesAnyType;

  public static readonly matchesType: (schemaType: string, value: unknown) => boolean = SchemaPredicates.matchesType;

  public static readonly satisfiesEnum: (value: unknown, enumValues: unknown[]) => boolean = RuntimeValuePredicates.satisfiesEnum;

  /**
   * Checks whether a semantic version string satisfies a range expression
   * (`*`, `^1.2.3`, `~1.2.3`, `>=`, `<=`, `>`, `<`, `=`, or a bare version for
   * exact match). Malformed version or range input returns `false`.
   */
  public static readonly satisfiesSemverRange: (version: string, range: string) => boolean = DateSemverPredicates.satisfiesSemverRange;

  public static readonly checkMinimum: (value: number, minimum: number, exclusive: boolean) => boolean = SchemaPredicates.checkMinimum;

  public static readonly checkMaximum: (value: number, maximum: number, exclusive: boolean) => boolean = SchemaPredicates.checkMaximum;

  /** Uses epsilon tolerance for floating-point rounding errors. */
  public static readonly checkMultipleOf: (value: number, divisor: number) => boolean = SchemaPredicates.checkMultipleOf;

  public static readonly checkPattern: (value: string, pattern: RegExp) => boolean = SchemaPredicates.checkPattern;

  /** Fast-paths: len<min→false, len>=2*min→true; walks code points only in residual band. */
  public static readonly satisfiesMinimumLength: (value: string, minimum: number) => boolean = SchemaPredicates.satisfiesMinimumLength;

  /** Fast-path: code_points <= utf16_length, so value.length<=max is definitely true. */
  public static readonly satisfiesMaximumLength: (value: string, maximum: number) => boolean = SchemaPredicates.satisfiesMaximumLength;

  /** Only base64/base64url are actively checked; unknown encodings return true per spec. */
  public static readonly satisfiesContentEncoding: (value: string, encoding: string) => boolean = SchemaPredicates.satisfiesContentEncoding;

  /** Only application/json is actively checked; unknown media types return true per spec. */
  public static readonly satisfiesContentMediaType: (value: string, mediaType: string, encoding?: string) => boolean = SchemaPredicates.satisfiesContentMediaType;

  /** Validates minContains/maxContains bounds against match count from a contains schema. */
  public static readonly satisfiesContains: (
    matchCount: number,
    options?: Readonly<{ 'maximumContains'?: number | undefined; 'minimumContains'?: number | undefined }>
  ) => boolean = SchemaPredicates.satisfiesContains;

  public static readonly satisfiesMinimumItems: (value: unknown[], minimum: number) => boolean = SchemaPredicates.satisfiesMinimumItems;

  public static readonly satisfiesMaximumItems: (value: unknown[], maximum: number) => boolean = SchemaPredicates.satisfiesMaximumItems;

  public static readonly satisfiesUniqueItems: (value: unknown[]) => boolean = RuntimeValuePredicates.satisfiesUniqueItems;

  /** Checks own properties only; inherited keys (e.g. from the prototype chain) never satisfy `required`. */
  public static readonly hasAllRequiredProperties: (value: Record<string, unknown>, required: string[]) => boolean = SchemaPredicates.hasAllRequiredProperties;

  public static readonly hasNoAdditionalProperties: (value: Record<string, unknown>, allowedKeys: Set<string>) => boolean = SchemaPredicates.hasNoAdditionalProperties;

  public static readonly satisfiesMinimumProperties: (value: Record<string, unknown>, minimum: number) => boolean = SchemaPredicates.satisfiesMinimumProperties;

  public static readonly satisfiesMaximumProperties: (value: Record<string, unknown>, maximum: number) => boolean = SchemaPredicates.satisfiesMaximumProperties;

  /** Converts an IPv4 dotted-decimal string to its 32-bit unsigned integer representation, or `undefined` when malformed. */
  public static readonly ipv4ToUint32: (ip: string) => number | undefined = SchemaPredicates.ipv4ToUint32;

  /** Parses CIDR notation into its inclusive `[start, end]` IPv4 range, or `undefined` when malformed. */
  public static readonly parseCidrRange: (cidr: string) => { readonly 'end': number; readonly 'start': number } | undefined = SchemaPredicates.parseCidrRange;
}
