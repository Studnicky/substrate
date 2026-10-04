/** Data constants for the `prototype-modification` rule: rule name, message, and the callee names it recognizes on `Object` and `Reflect`. */

export const RULE_NAME = 'v8Optimization/prototypeModification';

export const MESSAGE = 'Prototype modification that is not provably one-shot, pre-instantiation setup (nested in a function or loop, so it can run again — after instances already exist and hot code has already compiled against them) forces V8 to deoptimize any already-optimized code that assumed the prototype chain was stable. See the rule source for the %GetOptimizationStatus evidence and reproduction command.';

// Resolved via CallIdentity.
export const OBJECT_PROTOTYPE_API_METHODS: ReadonlySet<string> = new Set([
  'assign',
  'defineProperties',
  'defineProperty',
  'setPrototypeOf'
]);
export const OBJECT_PROTOTYPE_API_OWNERS: ReadonlySet<string> = new Set(['ObjectConstructor']);

// `Reflect.set` / `Reflect.setPrototypeOf` — also resolved via CallIdentity.
export const REFLECT_PROTOTYPE_API_METHODS: ReadonlySet<string> = new Set([
  'set',
  'setPrototypeOf'
]);
export const REFLECT_PROTOTYPE_API_OWNERS: ReadonlySet<string> = new Set(['Reflect']);
