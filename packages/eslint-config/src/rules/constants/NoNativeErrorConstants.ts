/** Data constants for the `no-native-error` rule: the global error constructors a library must not construct or extend, and the abort receiver type whose `abort()` requires a reason. */

export const NATIVE_ERROR_CONSTRUCTORS: ReadonlySet<string> = new Set([
  'AggregateError',
  'DOMException',
  'Error',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError'
]);

export const ABORT_CONTROLLER_TYPE_NAME = 'AbortController';

export const ABORT_METHOD_NAME = 'abort';

export const DEFAULT_BASE_CLASS_NAMES: readonly string[] = ['BaseError'];
