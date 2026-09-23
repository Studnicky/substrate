/** Data constants for the `prototype-modification` rule: rule name, message, and the callee names it recognizes on `Object` and `Reflect`. */

export const RULE_NAME = 'v8Optimization/prototypeModification';

export const MESSAGE = 'Prototype modification that is not provably one-shot, pre-instantiation setup (nested in a function or loop, so it can run again — after instances already exist and hot code has already compiled against them) forces V8 to deoptimize any already-optimized code that assumed the prototype chain was stable. See the rule source for the %GetOptimizationStatus evidence and reproduction command.';

// Resolved via CallIdentity; see docs/eslint/rules/v8/prototype-modification.md for why Reflect's equivalents are not.
export const OBJECT_PROTOTYPE_API_METHODS: ReadonlySet<string> = new Set([
  'assign',
  'defineProperties',
  'defineProperty',
  'setPrototypeOf'
]);
export const OBJECT_PROTOTYPE_API_OWNERS: ReadonlySet<string> = new Set(['ObjectConstructor']);

// `Reflect.set` / `Reflect.setPrototypeOf` — matched by direct callee shape, not migrated to
// `CallIdentity`; see docs/eslint/rules/v8/prototype-modification.md.
export const REFLECT_CALLEE_NAMES: ReadonlySet<string> = new Set([
  'set',
  'setPrototypeOf'
]);
