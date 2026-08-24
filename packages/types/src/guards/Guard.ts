/**
 * Type-safe accessors and type guards for wire format JSON values.
 *
 * Static methods on `Guard` narrow `unknown` values to concrete types without
 * unsafe assertions. Use these when processing external API responses or any
 * dynamically-typed payload where the shape is not yet known.
 *
 * Extend `Guard` and `static override isObject` to customise record detection;
 * `asRecordArray` delegates through `this.isObject` so overrides propagate.
 */
export class Guard {
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
    const result = Guard.isObjectLike(value) && !Array.isArray(value);
    return result;
  }

  /**
   * Returns `true` when `value` is a plain object — non-null, non-array, and its prototype is
   * exactly `Object.prototype` or `null` (`Object.create(null)`). Stricter than `isObject`: a
   * class instance (custom prototype) fails this even though it passes `isObject`.
   */
  public static isPlainObject(value: unknown): value is Record<string, unknown> {
    if (!Guard.isRecord(value)) {
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
    if (!Guard.isObjectLike(value) && !Guard.isFunction(value)) {
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
    if (!Guard.isObjectLike(value)) {
      return false;
    }
    const result = typeof Reflect.get(value, Symbol.iterator) === 'function';
    return result;
  }

  /** Type guard for a value implementing the async-iterable protocol (`Symbol.asyncIterator`). */
  public static isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
    if (!Guard.isObjectLike(value)) {
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
}
