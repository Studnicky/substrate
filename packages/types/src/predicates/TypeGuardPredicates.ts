import { ALPHANUMERIC_PATTERN } from './constants/index.js';

/**
 * Type-safe accessors and primitive/structural type guards narrowing `unknown`
 * without unsafe assertions. Base of the `Predicates` static-method chain.
 */
export class TypeGuardPredicates {
  /**
   * Returns the value as `number` when it is a number, otherwise returns
   * `undefined`.
   */
  public static asNumber(value: unknown): number | undefined {
    const result = typeof value === 'number' ? value : undefined;
    return result;
  }

  /**
   * Returns the value as a finite `number`, coercing a non-empty numeric
   * string. Returns `undefined` for `NaN`, an empty/whitespace-only string,
   * or any other non-numeric input.
   */
  public static asStrictNumber(value: unknown): number | undefined {
    if (typeof value === 'number') {
      const result = Number.isNaN(value) ? undefined : value;
      return result;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (trimmed === '') {
        return undefined;
      }

      const parsed = Number(trimmed);

      const result = Number.isNaN(parsed) ? undefined : parsed;
      return result;
    }

    return undefined;
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

  public static isString<T>(value: T): value is string & T {
    if (typeof value === 'string') {
      return true;
    }
    return false;
  }

  public static isNumber<T>(value: T): value is number & T {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return true;
    }
    return false;
  }

  /**
   * Type guard for the `number` primitive, including `NaN` and `±Infinity`.
   * Use this over `isNumber` when the caller needs to route those values to
   * a more specific downstream check (e.g. a separate "must be finite" or
   * "must not be NaN" error) rather than reject them at the type gate.
   */
  public static isNumberType<T>(value: T): value is number & T {
    const result = typeof value === 'number';
    return result;
  }

  public static isBoolean<T>(value: T): value is boolean & T {
    if (typeof value === 'boolean') {
      return true;
    }
    return false;
  }

  public static isFunction<T extends (...argumentList: unknown[]) => unknown>(value: T): value is T;
  public static isFunction(value: unknown): value is (...argumentList: unknown[]) => unknown;
  public static isFunction(value: unknown): boolean {
    if (typeof value === 'function') {
      return true;
    }
    return false;
  }

  /** `isObjectLike` or `isFunction` — the shape a `WeakMap`-tracked reference cycle guard accepts. */
  public static isObjectLikeOrFunction<T>(value: T): value is object & T {
    const result = TypeGuardPredicates.isObjectLike(value) || TypeGuardPredicates.isFunction(value);
    return result;
  }

  /**
   * Returns `true` when `value` is any non-null object — including an array, `Map`, `Set`, or a
   * class instance of unknown provenance. This is the check for "did `Reflect.construct` produce
   * an object at all," not "is this a plain record"; use `isObject` instead when the code goes on
   * to do bracket-property access and genuinely needs to exclude `Array`/`Map`/`Set`.
   */
  public static isObjectLike<T>(value: T): value is object & T {
    const result = typeof value === 'object' && value !== null;
    return result;
  }

  /** Type guard for a `Map` instance. */
  public static isMap<T>(value: T): value is Map<unknown, unknown> & T {
    const result = value instanceof Map;
    return result;
  }

  /** Type guard for a `Set` instance. */
  public static isSet<T>(value: T): value is Set<unknown> & T {
    const result = value instanceof Set;
    return result;
  }

  /** Type guard for a `Date` instance. */
  public static isDate<T>(value: T): value is Date & T {
    const result = value instanceof Date;
    return result;
  }

  /** Type guard for an array — `Array.isArray` narrowed to `readonly unknown[]`. */
  public static isArray<T>(value: T): value is readonly unknown[] & T {
    const result = Array.isArray(value);
    return result;
  }

  /**
   * Returns `true` when `value` is a non-null, non-array object of ANY prototype — a `Map`, a
   * `Set`, or a class instance all pass. This is `isObjectLike` minus arrays: broader than
   * `isObject` (which additionally excludes `Map`/`Set`) and looser than `isPlainObject` (which
   * additionally requires `Object.prototype`/`null` as the prototype).
   */
  public static isRecord<T>(value: T): value is Record<string, unknown> & T {
    const result = TypeGuardPredicates.isObjectLike(value) && !Array.isArray(value);
    return result;
  }

  /**
   * Returns `true` when `value` is a plain object — non-null, non-array, and its prototype is
   * exactly `Object.prototype` or `null` (`Object.create(null)`). Stricter than `isObject`: a
   * class instance (custom prototype) fails this even though it passes `isObject`.
   */
  public static isPlainObject<T>(value: T): value is Record<string, unknown> & T {
    if (!TypeGuardPredicates.isRecord(value)) {
      return false;
    }
    const prototype: unknown = Object.getPrototypeOf(value);
    const result = prototype === Object.prototype || prototype === null;
    return result;
  }

  /** Type guard for `null` or `undefined`. */
  public static isNullish<T>(value: T): value is (null | undefined) & T {
    const result = value === null || value === undefined;
    return result;
  }

  /** Type guard for a `RegExp` instance. */
  public static isRegExp<T>(value: T): value is RegExp & T {
    const result = value instanceof RegExp;
    return result;
  }

  /** Type guard for a `symbol`. */
  public static isSymbol<T>(value: T): value is symbol & T {
    const result = typeof value === 'symbol';
    return result;
  }

  /** Type guard for a `bigint`. */
  public static isBigInt<T>(value: T): value is bigint & T {
    const result = typeof value === 'bigint';
    return result;
  }

  /**
   * Type guard for a thenable — an object or function exposing a callable `.then`. Node's own
   * `Promise.resolve` uses exactly this duck-type check (not `instanceof Promise`) to decide
   * whether to adopt a value's resolution, which is why this checks structure rather than class.
   */
  public static isThenable<T>(value: T): value is PromiseLike<unknown> & T {
    if (!TypeGuardPredicates.isObjectLike(value) && !TypeGuardPredicates.isFunction(value)) {
      return false;
    }
    const result = 'then' in value && typeof value.then === 'function';
    return result;
  }

  /** Type guard for a value implementing the iterable protocol (`Symbol.iterator`). */
  public static isIterable<T>(value: T): value is Iterable<unknown> & T {
    if (typeof value === 'string') {
      return true;
    }
    if (!TypeGuardPredicates.isObjectLike(value)) {
      return false;
    }
    const result = typeof Reflect.get(value, Symbol.iterator) === 'function';
    return result;
  }

  /** Type guard for a value implementing the async-iterable protocol (`Symbol.asyncIterator`). */
  public static isAsyncIterable<T>(value: T): value is AsyncIterable<unknown> & T {
    if (!TypeGuardPredicates.isObjectLike(value)) {
      return false;
    }
    const result = typeof Reflect.get(value, Symbol.asyncIterator) === 'function';
    return result;
  }

  /** Type guard for a typed array or `DataView` over an `ArrayBuffer`. */
  public static isArrayBufferView<T>(value: T): value is ArrayBufferView & T {
    const result = ArrayBuffer.isView(value);
    return result;
  }

  // WEB-STANDARD API GUARDS. `Blob`, `FormData`, `URL`, `URLSearchParams`, `Headers`, `Request`,
  // `Response`, `AbortSignal`, and `ReadableStream` are WHATWG-standard classes implemented
  // natively in both browsers and Node (Node's `undici`-backed fetch since v18) — not DOM-only
  // globals this package needs to guard the existence of before referencing.

  /** Type guard for a `Blob` instance (a `File` is a `Blob`, so this accepts both). */
  public static isBlob<T>(value: T): value is Blob & T {
    const result = value instanceof Blob;
    return result;
  }

  /** Type guard for a `FormData` instance. */
  public static isFormData<T>(value: T): value is FormData & T {
    const result = value instanceof FormData;
    return result;
  }

  /** Type guard for a `URL` instance. */
  public static isURL<T>(value: T): value is T & URL {
    const result = value instanceof URL;
    return result;
  }

  /** Type guard for a `URLSearchParams` instance. */
  public static isURLSearchParams<T>(value: T): value is T & URLSearchParams {
    const result = value instanceof URLSearchParams;
    return result;
  }

  /** Type guard for a `Headers` instance. */
  public static isHeaders<T>(value: T): value is Headers & T {
    const result = value instanceof Headers;
    return result;
  }

  /** Type guard for a `Request` instance. */
  public static isRequest<T>(value: T): value is Request & T {
    const result = value instanceof Request;
    return result;
  }

  /** Type guard for a `Response` instance. */
  public static isResponse<T>(value: T): value is Response & T {
    const result = value instanceof Response;
    return result;
  }

  /** Type guard for an `AbortSignal` instance. */
  public static isAbortSignal<T>(value: T): value is AbortSignal & T {
    const result = value instanceof AbortSignal;
    return result;
  }

  /** Type guard for a `ReadableStream` instance. */
  public static isReadableStream<T>(value: T): value is ReadableStream & T {
    const result = value instanceof ReadableStream;
    return result;
  }

  /**
   * Type guard for a real `Error` instance, including cross-realm errors (an `Error` constructed
   * in a different `vm.Context`/iframe, which fails `instanceof Error` but is still a genuine
   * error object). Delegates to `Error.isError`, the runtime's own answer to that question, rather
   * than a hand-rolled `instanceof Error` check.
   */
  public static isError<T>(value: T): value is Error & T {
    const result = Error.isError(value);
    return result;
  }

  /**
   * Type guard for non-negative integers (>= 0).
   */
  public static isNonNegativeInteger<T>(value: T): value is number & T {
    const result = typeof value === 'number' && Number.isInteger(value) && value >= 0;
    return result;
  }

  /**
   * Type guard for positive integers (> 0).
   */
  public static isPositiveInteger<T>(value: T): value is number & T {
    const result = typeof value === 'number' && Number.isInteger(value) && value > 0;
    return result;
  }

  /** Checks whether a record has a specific own property. */
  public static doesObjectContainProperty(candidate: unknown, propertyName: string): boolean {
    if (!TypeGuardPredicates.isRecord(candidate)) {
      return false;
    }

    const result = Object.hasOwn(candidate, propertyName);
    return result;
  }

  /** Checks whether a value is defined (not `undefined`). */
  public static isDefined(value: unknown): boolean {
    const result = value !== undefined;
    return result;
  }

  /** Checks whether an array is empty. */
  public static isEmptyArray(value: unknown): boolean {
    const result = TypeGuardPredicates.isArray(value) && value.length === 0;
    return result;
  }

  /** Checks whether a `Map` is empty. */
  public static isEmptyMap(value: unknown): boolean {
    const result = TypeGuardPredicates.isMap(value) && value.size === 0;
    return result;
  }

  /** Checks whether a value is a plain object with no enumerable properties. */
  public static isEmptyPlainObject(value: unknown): boolean {
    if (!TypeGuardPredicates.isPlainObject(value)) {
      return false;
    }
    const result = Object.keys(value).length === 0;
    return result;
  }

  /** Checks whether a `RegExp` has an empty pattern (`(?:)`). */
  public static isEmptyRegExp(value: unknown): boolean {
    const result = TypeGuardPredicates.isRegExp(value) && value.source === '(?:)';
    return result;
  }

  /** Checks whether a `Set` is empty. */
  public static isEmptySet(value: unknown): boolean {
    const result = TypeGuardPredicates.isSet(value) && value.size === 0;
    return result;
  }

  /** Checks whether a string is empty. */
  public static isEmptyString(value: unknown): boolean {
    const result = TypeGuardPredicates.isString(value) && value.length === 0;
    return result;
  }

  /** Checks whether a typed array or `DataView` spans zero bytes. */
  public static isEmptyTypedArray(value: unknown): boolean {
    const result = TypeGuardPredicates.isArrayBufferView(value) && value.byteLength === 0;
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
  public static isFiniteNumber<T>(value: T): value is number & T {
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
  public static isInstanceOf<Instance>(value: unknown, constructor: Function & { readonly 'prototype': Instance }): value is Instance {
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
       && typeof Reflect.get(value, 'then') === 'function');
    return result;
  }

  /** Checks whether a value is a two-element array (a `[minimum, maximum]` range tuple). */
  public static isRangeValid<T>(range: T): range is readonly unknown[] & T {
    const result = TypeGuardPredicates.isArray(range) && range.length === 2;
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
}
