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
 * Extend `Predicates` and `static override isObject` to customise record detection;
 * `asRecordArray` delegates through `this.isObject` so overrides propagate.
 */

import {
  ALPHANUMERIC_PATTERN,
  DATE_LIKE_TIMESTAMP_RANGE,
  MULTIPLE_OF_EPSILON_FACTOR,
  REDOS_VULNERABLE_PATTERNS,
  SUPPORTED_CONTENT_ENCODINGS,
  SUPPORTED_CONTENT_MEDIA_TYPES,
  TIME_ONLY_PATTERN
} from './constants/index.js';

export class Predicates {
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

  /**
   * Returns the value as `number` when it is a number, otherwise returns
   * `undefined`.
   */
  public static asNumber(value: unknown): number | undefined {
    const result = typeof value === 'number' ? value : undefined;
    return result;
  }

  /**
   * Returns the value as `string | null` when it is a string or `null`,
   * otherwise returns `undefined`.
   */
  public static asStringOrNull(value: unknown): string | null | undefined {
    if (value === null) {
      return null;
    }
    const result = typeof value === 'string' ? value : undefined;
    return result;
  }

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

  public static isString(value: unknown): value is string {
    if (typeof value === 'string') {
      return true;
    }
    return false;
  }

  public static isNumber(value: unknown): value is number {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return true;
    }
    return false;
  }

  public static isBoolean(value: unknown): value is boolean {
    if (typeof value === 'boolean') {
      return true;
    }
    return false;
  }

  public static isFunction(value: unknown): value is (...argumentList: unknown[]) => unknown {
    if (typeof value === 'function') {
      return true;
    }
    return false;
  }

  /**
   * Returns `true` when `value` is any non-null object — including an array, `Map`, `Set`, or a
   * class instance of unknown provenance. This is the check for "did `Reflect.construct` produce
   * an object at all," not "is this a plain record"; use `isObject` instead when the code goes on
   * to do bracket-property access and genuinely needs to exclude `Array`/`Map`/`Set`.
   */
  public static isObjectLike(value: unknown): value is object {
    const result = typeof value === 'object' && value !== null;
    return result;
  }

  /**
   * Returns `true` when `value` is a plain, non-null, non-array object.
   * `Map` and `Set` instances return `false` — a `Record<string, unknown>`
   * must support bracket-property access, which neither collection provides.
   * This is the canonical plain-object check for the package: `Empty.isObject`
   * and `JsonObject.is` both delegate here rather than reimplementing the
   * exclusion. `asRecordArray` delegates here too; static override this method
   * in a subclass to customise what counts as a record.
   */
  public static isObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }
    const result = !(value instanceof Map) && !(value instanceof Set);
    return result;
  }

  /** Type guard for a `Map` instance. */
  public static isMap(value: unknown): value is Map<unknown, unknown> {
    const result = value instanceof Map;
    return result;
  }

  /** Type guard for a `Set` instance. */
  public static isSet(value: unknown): value is Set<unknown> {
    const result = value instanceof Set;
    return result;
  }

  /** Type guard for a `Date` instance. */
  public static isDate(value: unknown): value is Date {
    const result = value instanceof Date;
    return result;
  }

  /** Type guard for an array — `Array.isArray` narrowed to `readonly unknown[]`. */
  public static isArray(value: unknown): value is readonly unknown[] {
    const result = Array.isArray(value);
    return result;
  }

  /**
   * Returns `true` when `value` is a non-null, non-array object of ANY prototype — a `Map`, a
   * `Set`, or a class instance all pass. This is `isObjectLike` minus arrays: broader than
   * `isObject` (which additionally excludes `Map`/`Set`) and looser than `isPlainObject` (which
   * additionally requires `Object.prototype`/`null` as the prototype).
   */
  public static isRecord(value: unknown): value is Record<string, unknown> {
    const result = Predicates.isObjectLike(value) && !Array.isArray(value);
    return result;
  }

  /**
   * Returns `true` when `value` is a plain object — non-null, non-array, and its prototype is
   * exactly `Object.prototype` or `null` (`Object.create(null)`). Stricter than `isObject`: a
   * class instance (custom prototype) fails this even though it passes `isObject`.
   */
  public static isPlainObject(value: unknown): value is Record<string, unknown> {
    if (!Predicates.isRecord(value)) {
      return false;
    }
    const prototype: unknown = Object.getPrototypeOf(value);
    const result = prototype === Object.prototype || prototype === null;
    return result;
  }

  /** Type guard for `null` or `undefined`. */
  public static isNullish(value: unknown): value is null | undefined {
    const result = value === null || value === undefined;
    return result;
  }

  /** Type guard for a `RegExp` instance. */
  public static isRegExp(value: unknown): value is RegExp {
    const result = value instanceof RegExp;
    return result;
  }

  /** Type guard for a `symbol`. */
  public static isSymbol(value: unknown): value is symbol {
    const result = typeof value === 'symbol';
    return result;
  }

  /** Type guard for a `bigint`. */
  public static isBigInt(value: unknown): value is bigint {
    const result = typeof value === 'bigint';
    return result;
  }

  /**
   * Type guard for a thenable — an object or function exposing a callable `.then`. Node's own
   * `Promise.resolve` uses exactly this duck-type check (not `instanceof Promise`) to decide
   * whether to adopt a value's resolution, which is why this checks structure rather than class.
   */
  public static isThenable(value: unknown): value is PromiseLike<unknown> {
    if (!Predicates.isObjectLike(value) && !Predicates.isFunction(value)) {
      return false;
    }
    const result = 'then' in value && typeof value.then === 'function';
    return result;
  }

  /** Type guard for a value implementing the iterable protocol (`Symbol.iterator`). */
  public static isIterable(value: unknown): value is Iterable<unknown> {
    if (typeof value === 'string') {
      return true;
    }
    if (!Predicates.isObjectLike(value)) {
      return false;
    }
    const result = typeof Reflect.get(value, Symbol.iterator) === 'function';
    return result;
  }

  /** Type guard for a value implementing the async-iterable protocol (`Symbol.asyncIterator`). */
  public static isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
    if (!Predicates.isObjectLike(value)) {
      return false;
    }
    const result = typeof Reflect.get(value, Symbol.asyncIterator) === 'function';
    return result;
  }

  /** Type guard for a typed array or `DataView` over an `ArrayBuffer`. */
  public static isArrayBufferView(value: unknown): value is ArrayBufferView {
    const result = ArrayBuffer.isView(value);
    return result;
  }

  // WEB-STANDARD API GUARDS. `Blob`, `FormData`, `URL`, `URLSearchParams`, `Headers`, `Request`,
  // `Response`, `AbortSignal`, and `ReadableStream` are WHATWG-standard classes implemented
  // natively in both browsers and Node (Node's `undici`-backed fetch since v18) — not DOM-only
  // globals this package needs to guard the existence of before referencing.

  /** Type guard for a `Blob` instance (a `File` is a `Blob`, so this accepts both). */
  public static isBlob(value: unknown): value is Blob {
    const result = value instanceof Blob;
    return result;
  }

  /** Type guard for a `FormData` instance. */
  public static isFormData(value: unknown): value is FormData {
    const result = value instanceof FormData;
    return result;
  }

  /** Type guard for a `URL` instance. */
  public static isURL(value: unknown): value is URL {
    const result = value instanceof URL;
    return result;
  }

  /** Type guard for a `URLSearchParams` instance. */
  public static isURLSearchParams(value: unknown): value is URLSearchParams {
    const result = value instanceof URLSearchParams;
    return result;
  }

  /** Type guard for a `Headers` instance. */
  public static isHeaders(value: unknown): value is Headers {
    const result = value instanceof Headers;
    return result;
  }

  /** Type guard for a `Request` instance. */
  public static isRequest(value: unknown): value is Request {
    const result = value instanceof Request;
    return result;
  }

  /** Type guard for a `Response` instance. */
  public static isResponse(value: unknown): value is Response {
    const result = value instanceof Response;
    return result;
  }

  /** Type guard for an `AbortSignal` instance. */
  public static isAbortSignal(value: unknown): value is AbortSignal {
    const result = value instanceof AbortSignal;
    return result;
  }

  /** Type guard for a `ReadableStream` instance. */
  public static isReadableStream(value: unknown): value is ReadableStream {
    const result = value instanceof ReadableStream;
    return result;
  }

  /**
   * Type guard for a real `Error` instance, including cross-realm errors (an `Error` constructed
   * in a different `vm.Context`/iframe, which fails `instanceof Error` but is still a genuine
   * error object). Delegates to `Error.isError`, the runtime's own answer to that question, rather
   * than a hand-rolled `instanceof Error` check.
   */
  public static isError(value: unknown): value is Error {
    const result = Error.isError(value);
    return result;
  }

  /**
   * Type guard for non-negative integers (>= 0).
   */
  public static isNonNegativeInteger(value: unknown): value is number {
    const result = typeof value === 'number' && Number.isInteger(value) && value >= 0;
    return result;
  }

  /**
   * Type guard for positive integers (> 0).
   */
  public static isPositiveInteger(value: unknown): value is number {
    const result = typeof value === 'number' && Number.isInteger(value) && value > 0;
    return result;
  }

  /** Deep-equality comparison of two arrays. */
  public static areArraysEqual(value: unknown[], filterValue: unknown[]): boolean {
    if (value.length !== filterValue.length) {
      return false;
    }

    const valueLength = value.length;

    for (let index = 0; index < valueLength; index++) {
      if (!Predicates.compareDeep(value[index], filterValue[index])) {
        return false;
      }
    }

    return true;
  }

  /** Deep-equality comparison of two `Map` instances. */
  public static areMapsEqual(value: Map<unknown, unknown>, filterValue: Map<unknown, unknown>): boolean {
    if (value.size !== filterValue.size) {
      return false;
    }

    for (const [
      key,
      entryValue
    ] of value) {
      if (!filterValue.has(key) || !Predicates.compareDeep(entryValue, filterValue.get(key))) {
        return false;
      }
    }

    return true;
  }

  /** `NaN` comparison for deep equality — `NaN` is considered equal to `NaN`. */
  public static areNaNEqual(value: unknown, filterValue: unknown): boolean {
    if (Number.isNaN(value) && Number.isNaN(filterValue)) {
      return true;
    }
    if (Number.isNaN(value) || Number.isNaN(filterValue)) {
      return false;
    }

    return false;
  }

  /** `NaN` comparison for strict equality — `NaN` is never equal to anything, including itself. */
  public static areNaNStrict(value: unknown, filterValue: unknown): boolean {
    if (Number.isNaN(value) || Number.isNaN(filterValue)) {
      return false;
    }

    return false;
  }

  /** Checks two values are not strictly equal using `Object.is` semantics. */
  public static areNotStrictlyEqual(value: unknown, filterValue: unknown): boolean {
    const result = !Object.is(value, filterValue);
    return result;
  }

  /** Checks null/undefined equality — `null`/`undefined` are only equal to themselves. */
  public static areNullUndefinedEqual(value: unknown, filterValue: unknown): boolean {
    if (value === null || value === undefined || filterValue === null || filterValue === undefined) {
      const result = value === filterValue;
      return result;
    }

    return false;
  }

  /** Deep-equality comparison of two plain objects. */
  public static areObjectsEqual(value: Record<string, unknown>, filterValue: Record<string, unknown>): boolean {
    const keys1 = Object.keys(value);
    const keys2 = Object.keys(filterValue);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (let index = 0; index < keys1.length; index++) {
      const key = keys1[index];
      if (key === undefined || !Object.hasOwn(filterValue, key)) {
        return false;
      }

      if (!Predicates.compareDeep(value[key], filterValue[key])) {
        return false;
      }
    }

    return true;
  }

  /** Object comparison using reference equality — `Date`/`RegExp`/array instances included. */
  public static areObjectsReferenceEqual(value: unknown, filterValue: unknown): boolean {
    if ((typeof value === 'object' && value !== null) || (typeof filterValue === 'object' && filterValue !== null)) {
      if (typeof value !== 'object' || typeof filterValue !== 'object' || value === null || filterValue === null) {
        return false;
      }

      const result = value === filterValue;
      return result;
    }

    return false;
  }

  /** Reference equality using `Object.is` semantics — correct for `NaN` and `-0`/`+0`. */
  public static areReferenceEqual(value: unknown, filterValue: unknown): boolean {
    if (value === filterValue) {
      const result = value !== 0 || 1 / (value as number) === 1 / (filterValue as number);
      return result;
    }

    const result = value !== value && filterValue !== filterValue;
    return result;
  }

  /** Case-sensitive or case-insensitive string comparison via a supplied `operation`. */
  public static areStringsMatching(
    value: string,
    filterValue: string,
    options: Readonly<{ 'caseSensitive'?: boolean; 'lowerValue'?: string }>,
    operation: (firstValue: string, secondValue: string) => boolean
  ): boolean {
    if (options.caseSensitive === false) {
      const lowerCaseFilterValue = options.lowerValue ?? filterValue.toLowerCase();

      const result = operation(value.toLowerCase(), lowerCaseFilterValue);
      return result;
    }

    const result = operation(value, filterValue);
    return result;
  }

  /** Validates that both values are strings. */
  public static areStringsValid(value: unknown, filterValue: unknown): value is string {
    const result = typeof value === 'string' && typeof filterValue === 'string';
    return result;
  }

  /** Checks two values share the same `typeof` result. */
  public static areTypesSame(value: unknown, filterValue: unknown): boolean {
    const result = typeof value === typeof filterValue;
    return result;
  }

  /** Checks two values are instances of the same constructor. */
  public static areInstancesOf<T>(
    value: unknown,
    filterValue: unknown,
    constructor: new (...constructorArguments: unknown[]) => T
  ): value is T {
    const result = value instanceof constructor && filterValue instanceof constructor;
    return result;
  }

  /** Checks whether a record has a specific own property. */
  public static doesObjectContainProperty(candidate: unknown, propertyName: string): boolean {
    if (!Predicates.isRecord(candidate)) {
      return false;
    }

    const result = Object.hasOwn(candidate, propertyName);
    return result;
  }

  /** Checks whether a value is a string containing only letters and numbers. */
  public static isAlphanumeric(value: unknown): boolean {
    const result = typeof value === 'string' && ALPHANUMERIC_PATTERN.test(value);
    return result;
  }

  /** Checks whether an array has a specific length. */
  public static isArrayLength(array: unknown, expectedLength: unknown): boolean {
    if (!Array.isArray(array) || typeof expectedLength !== 'number') {
      return false;
    }

    const result = array.length === expectedLength;
    return result;
  }

  /** Checks whether a value can be called as a function — plain `boolean`, not a type predicate. */
  public static isCallable(value: unknown): boolean {
    const result = typeof value === 'function';
    return result;
  }

  /** Checks whether a numeric value is close to another within a decimal precision (default 2). */
  public static isCloseTo(value: unknown, expected: unknown, precision = 2): boolean {
    if (typeof value !== 'number' || typeof expected !== 'number') {
      return false;
    }

    if (!Number.isFinite(value) || !Number.isFinite(expected)) {
      const result = value === expected;
      return result;
    }

    const pass = Math.abs(expected - value) < Math.pow(10, -precision) / 2;

    return pass;
  }

  /**
   * Checks whether a value is date-like: a `Date` instance (even an invalid one), a numeric
   * timestamp within 1990-2100, a time-only string (`HH:MM`/`HH:MM:SS`), or a parseable date string.
   */
  public static isDateLike(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (value instanceof Date) {
      return true;
    }

    if (typeof value !== 'string' && typeof value !== 'number') {
      return false;
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        return false;
      }

      const result = value >= DATE_LIKE_TIMESTAMP_RANGE.MINIMUM && value <= DATE_LIKE_TIMESTAMP_RANGE.MAXIMUM;
      return result;
    }

    if (typeof value === 'string') {
      if (value.trim() === '') {
        return false;
      }

      const trimmedValue = value.trim();

      const timeMatch = TIME_ONLY_PATTERN.exec(trimmedValue);

      if (timeMatch !== null) {
        const hours = parseInt(timeMatch[1] ?? '0', 10);
        const minutes = parseInt(timeMatch[2] ?? '0', 10);
        const seconds = timeMatch[3] === undefined ? 0 : parseInt(timeMatch[3], 10);

        const result = hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59;
        return result;
      }

      try {
        const parsed = Date.parse(trimmedValue);

        const result = !isNaN(parsed);
        return result;
      } catch {
        return false;
      }
    }

    return false;
  }

  /** Checks whether a value is defined (not `undefined`). */
  public static isDefined(value: unknown): boolean {
    const result = value !== undefined;
    return result;
  }

  /** Checks whether an array is empty. */
  public static isEmptyArray(value: unknown): boolean {
    const result = Array.isArray(value) && value.length === 0;
    return result;
  }

  /** Checks whether a `Map` is empty. */
  public static isEmptyMap(value: unknown): boolean {
    const result = value instanceof Map && value.size === 0;
    return result;
  }

  /** Checks whether a value is a plain object with no enumerable properties. */
  public static isEmptyPlainObject(value: unknown): boolean {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return false;
    }

    const keys = Object.keys(value);
    const result = keys.length === 0;
    return result;
  }

  /** Checks whether a `RegExp` has an empty pattern (`(?:)`). */
  public static isEmptyRegExp(value: unknown): boolean {
    const result = value instanceof RegExp && value.source === '(?:)';
    return result;
  }

  /** Checks whether a `Set` is empty. */
  public static isEmptySet(value: unknown): boolean {
    const result = value instanceof Set && value.size === 0;
    return result;
  }

  /** Checks whether a string is empty. */
  public static isEmptyString(value: unknown): boolean {
    const result = typeof value === 'string' && value.length === 0;
    return result;
  }

  /** Checks whether a typed array has length 0. */
  public static isEmptyTypedArray(value: unknown): boolean {
    const result = ArrayBuffer.isView(value) && (value as Uint8Array).length === 0;
    return result;
  }

  /** Checks whether a number is even. */
  public static isEven(value: unknown): boolean {
    const result = typeof value === 'number' && Number.isFinite(value) && value % 2 === 0;
    return result;
  }

  /** Checks whether a value is strictly `false`. */
  public static isFalse(value: unknown): boolean {
    const result = value === false;
    return result;
  }

  /** Checks whether a value is falsy in boolean context. */
  public static isFalsy(value: unknown): boolean {
    const result = Boolean(value) === false;
    return result;
  }

  /** Checks whether a value is a finite number (not `Infinity`, `-Infinity`, or `NaN`). */
  public static isFiniteNumber(value: unknown): boolean {
    const result = typeof value === 'number' && Number.isFinite(value);
    return result;
  }

  /** Checks whether a value is greater than another — supports numbers, strings, and `Date`. */
  public static isGreaterThan(value: unknown, comparison: unknown): boolean {
    if (typeof value === 'number' && typeof comparison === 'number') {
      const result = value > comparison;
      return result;
    }

    if (typeof value === 'string' && typeof comparison === 'string') {
      const result = value > comparison;
      return result;
    }

    if (value instanceof Date && comparison instanceof Date) {
      const result = value.getTime() > comparison.getTime();
      return result;
    }

    return false;
  }

  /** Checks whether a value is greater than or equal to another — numbers, strings, `Date`. */
  public static isGreaterThanOrEqual(value: unknown, comparison: unknown): boolean {
    if (typeof value === 'number' && typeof comparison === 'number') {
      const result = value >= comparison;
      return result;
    }

    if (typeof value === 'string' && typeof comparison === 'string') {
      const result = value >= comparison;
      return result;
    }

    if (value instanceof Date && comparison instanceof Date) {
      const result = value.getTime() >= comparison.getTime();
      return result;
    }

    return false;
  }

  /** Checks whether a value is an instance of the given constructor. */
  public static isInstanceOf(value: unknown, constructor: new (...argumentList: unknown[]) => unknown): boolean {
    try {
      const result = value instanceof constructor;
      return result;
    } catch {
      return false;
    }
  }

  /** Checks whether a value is an integer. */
  public static isIntegerValue(value: unknown): boolean {
    const result = typeof value === 'number' && Number.isInteger(value);
    return result;
  }

  /** Checks whether a value is less than another — supports numbers, strings, and `Date`. */
  public static isLessThan(value: unknown, comparison: unknown): boolean {
    if (typeof value === 'number' && typeof comparison === 'number') {
      const result = value < comparison;
      return result;
    }

    if (typeof value === 'string' && typeof comparison === 'string') {
      const result = value < comparison;
      return result;
    }

    if (value instanceof Date && comparison instanceof Date) {
      const result = value.getTime() < comparison.getTime();
      return result;
    }

    return false;
  }

  /** Checks whether a value is less than or equal to another — numbers, strings, `Date`. */
  public static isLessThanOrEqual(value: unknown, comparison: unknown): boolean {
    if (typeof value === 'number' && typeof comparison === 'number') {
      const result = value <= comparison;
      return result;
    }

    if (typeof value === 'string' && typeof comparison === 'string') {
      const result = value <= comparison;
      return result;
    }

    if (value instanceof Date && comparison instanceof Date) {
      const result = value.getTime() <= comparison.getTime();
      return result;
    }

    return false;
  }

  /** Checks whether a number is negative (< 0). */
  public static isNegative(value: unknown): boolean {
    const result = typeof value === 'number' && value < 0;
    return result;
  }

  /** Checks whether a value is not `null`. */
  public static isNotNull(value: unknown): boolean {
    const result = value !== null;
    return result;
  }

  /** Checks whether a value is `null`. */
  public static isNull(value: unknown): boolean {
    const result = value === null;
    return result;
  }

  /** Checks whether an object has exactly the specified number of own enumerable properties. */
  public static isObjectPropertyCount(object: unknown, expectedCount: unknown): boolean {
    if (typeof object !== 'object' || object === null || typeof expectedCount !== 'number') {
      return false;
    }

    const result = Object.keys(object).length === expectedCount;
    return result;
  }

  /** Checks whether a number is odd. */
  public static isOdd(value: unknown): boolean {
    const result = typeof value === 'number' && Number.isFinite(value) && Math.abs(value % 2) === 1;
    return result;
  }

  /** Checks whether a number is positive (> 0). */
  public static isPositive(value: unknown): boolean {
    const result = typeof value === 'number' && value > 0;
    return result;
  }

  /** Checks whether a value is a `Promise` or a thenable object — plain `boolean`. */
  public static isPromise(value: unknown): boolean {
    const result = value instanceof Promise
      || (value !== null
       && value !== undefined
       && typeof value === 'object'
       && typeof (value as Record<string, unknown>).then === 'function');
    return result;
  }

  /** Checks whether a value is a two-element array (a `[minimum, maximum]` range tuple). */
  public static isRangeValid(range: unknown): range is readonly unknown[] {
    const result = Predicates.isArray(range) && range.length === 2;
    return result;
  }

  /** Checks whether a value is a string of the specified length. */
  public static isStringLength(value: unknown, length: number): boolean {
    const result = typeof value === 'string' && value.length === length;
    return result;
  }

  /** Checks whether a value is strictly `true`. */
  public static isTrue(value: unknown): boolean {
    const result = value === true;
    return result;
  }

  /** Checks whether a value is truthy in boolean context. */
  public static isTruthy(value: unknown): boolean {
    const result = Boolean(value) === true;
    return result;
  }

  /** Checks whether `typeof value` equals the given type string. */
  public static isTypeOf(value: unknown, type: string): boolean {
    const result = typeof value === type;
    return result;
  }

  /** Checks whether a value is `undefined`. */
  public static isUndefined(value: unknown): boolean {
    const result = value === undefined;
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
  public static performRangeComparison(value: unknown, minimum: unknown, maximum: unknown, inclusive: boolean): boolean {
    const numericResult = Predicates.compareNumericRange(value, minimum, maximum, inclusive);

    if (numericResult !== null) {
      return numericResult;
    }

    const dateResult = Predicates.compareDateRange(value, minimum, maximum, inclusive);

    if (dateResult !== null) {
      return dateResult;
    }

    const stringResult = Predicates.compareStringRange(value, minimum, maximum, inclusive);

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
      if (Predicates.matchesType(schemaType, value)) {
        return true;
      }
    }
    return false;
  }

  public static matchesType(schemaType: string, value: unknown): boolean {
    const matcher = Predicates.typeMatchers.get(schemaType);

    const result = matcher === undefined ? Predicates.inferValueType(value) === schemaType : matcher(value);
    return result;
  }

  public static satisfiesEnum(value: unknown, enumValues: unknown[]): boolean {
    const enumValueCount = enumValues.length;
    for (let index = 0; index < enumValueCount; index += 1) {
      const enumValue = enumValues[index];
      if (Predicates.compareDeep(value, enumValue)) {
        return true;
      }
    }
    return false;
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

    const result = Predicates.codePointLengthAtLeast(value, minimum);
    return result;
  }

  /** Fast-path: code_points <= utf16_length, so value.length<=max is definitely true. */
  public static satisfiesMaximumLength(value: string, maximum: number): boolean {
    if (value.length <= maximum) {
      return true;
    }

    const result = Predicates.codePointLengthAtMost(value, maximum);
    return result;
  }

  /** Only base64/base64url are actively checked; unknown encodings return true per spec. */
  public static satisfiesContentEncoding(value: string, encoding: string): boolean {
    if (!SUPPORTED_CONTENT_ENCODINGS.has(encoding)) {
      return true;
    }

    const result = Predicates.decodeBase64Safe(value, encoding === 'base64url') !== null;
    return result;
  }

  /** Only application/json is actively checked; unknown media types return true per spec. */
  public static satisfiesContentMediaType(value: string, mediaType: string, encoding?: string): boolean {
    if (!SUPPORTED_CONTENT_MEDIA_TYPES.has(mediaType)) {
      return true;
    }

    let content = value;

    if (encoding !== undefined && SUPPORTED_CONTENT_ENCODINGS.has(encoding)) {
      const decoded = Predicates.decodeBase64Safe(value, encoding === 'base64url');

      if (decoded === null) {
        return false;
      }

      content = decoded;
    }

    if (mediaType === 'application/json') {
      const result = Predicates.isValidJson(content);
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

  public static satisfiesUniqueItems(value: unknown[]): boolean {
    const valueLength = value.length;

    for (let index = 0; index < valueLength; index++) {
      for (let other = index + 1; other < valueLength; other++) {
        if (Predicates.compareDeep(value[index], value[other])) {
          return false;
        }
      }
    }

    return true;
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

  /**
   * Shared deep-equality walk backing `areArraysEqual`, `areMapsEqual`, `areObjectsEqual`,
   * `satisfiesEnum`, and `satisfiesUniqueItems`. Handles `Map` instances in addition to arrays
   * and plain objects — the superset of the three near-identical helpers this replaces.
   */
  private static compareDeep(value: unknown, filterValue: unknown): boolean {
    if (value === filterValue) {
      return true;
    }

    if (value === null || value === undefined || filterValue === null || filterValue === undefined) {
      const result = value === filterValue;
      return result;
    }

    if (Array.isArray(value) && Array.isArray(filterValue)) {
      if (value.length !== filterValue.length) {
        return false;
      }
      const valueLength = value.length;
      for (let index = 0; index < valueLength; index++) {
        if (!Predicates.compareDeep(value[index], filterValue[index])) {
          return false;
        }
      }

      return true;
    }

    if (value instanceof Map && filterValue instanceof Map) {
      if (value.size !== filterValue.size) {
        return false;
      }
      for (const [
        key,
        entryValue
      ] of value) {
        if (!filterValue.has(key) || !Predicates.compareDeep(entryValue, filterValue.get(key))) {
          return false;
        }
      }

      return true;
    }

    if (typeof value === 'object' && typeof filterValue === 'object') {
      const keys1 = Object.keys(value);
      const keys2 = Object.keys(filterValue);

      if (keys1.length !== keys2.length) {
        return false;
      }

      for (let index = 0; index < keys1.length; index++) {
        const key = keys1[index];
        if (key === undefined || !Object.hasOwn(filterValue, key)) {
          return false;
        }
        const valueRecord = value as Record<string, unknown>;
        const filterRecord = filterValue as Record<string, unknown>;

        if (!Predicates.compareDeep(valueRecord[key], filterRecord[key])) {
          return false;
        }
      }

      return true;
    }

    const result = value === filterValue;
    return result;
  }

  /** Checks if all values are numbers and performs numeric range comparison. */
  private static compareNumericRange(value: unknown, minimum: unknown, maximum: unknown, inclusive: boolean): boolean | null {
    if (typeof value === 'number' && typeof minimum === 'number' && typeof maximum === 'number') {
      const result = inclusive
        ? value >= minimum && value <= maximum
        : value < minimum || value > maximum;

      return result;
    }

    return null;
  }

  /** Checks if all values are Dates and performs date range comparison. */
  private static compareDateRange(value: unknown, minimum: unknown, maximum: unknown, inclusive: boolean): boolean | null {
    if (value instanceof Date && minimum instanceof Date && maximum instanceof Date) {
      const valueTime = value.getTime();
      const minimumTime = minimum.getTime();
      const maximumTime = maximum.getTime();

      const result = inclusive
        ? valueTime >= minimumTime && valueTime <= maximumTime
        : valueTime < minimumTime || valueTime > maximumTime;

      return result;
    }

    return null;
  }

  /** Checks if all values are strings and performs lexicographic range comparison. */
  private static compareStringRange(value: unknown, minimum: unknown, maximum: unknown, inclusive: boolean): boolean | null {
    if (typeof value === 'string' && typeof minimum === 'string' && typeof maximum === 'string') {
      const result = inclusive
        ? value >= minimum && value <= maximum
        : value < minimum || value > maximum;

      return result;
    }

    return null;
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
