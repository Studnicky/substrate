import type { PassThroughMethodEntity } from '../PassThroughMethodEntity.js';

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

export const PROMISE_GLOBAL_NAME = 'Promise';

export const PROMISE_REJECT_METHOD_NAME = 'reject';

export const PROMISE_RESOLVERS_INTERFACE_NAME = 'PromiseWithResolvers';

export const CALLER_FAULT_CLASS_NAME = 'CallerFault';

export const CALLER_FAULT_METHOD_NAME = 'propagate';

export const CALLER_FAULT_REJECTION_METHOD_NAME = 'rejection';

export const DEFAULT_PASS_THROUGH_METHODS: readonly PassThroughMethodEntity.Type[] = [
  { 'class': CALLER_FAULT_CLASS_NAME, 'method': CALLER_FAULT_METHOD_NAME },
  { 'class': CALLER_FAULT_CLASS_NAME, 'method': CALLER_FAULT_REJECTION_METHOD_NAME }
];

export const EXEMPTABLE_MESSAGE_IDS: ReadonlySet<string> = new Set(['nonBaseReject', 'nonBaseThrow', 'nonBaseThrowInCatch']);

export const RESOLVER_STORE_VALUE_KEYS: ReadonlyMap<string, string> = new Map([
  ['AssignmentExpression', 'right'],
  ['Property', 'value'],
  ['VariableDeclarator', 'init']
]);
