/** Data constants for the `prototype-modification` rule: rule name, message, and the callee names it recognizes on `Object` and `Reflect`. */

export const RULE_NAME = 'v8Optimization/prototypeModification';

export const MESSAGE = 'Prototype modification that is not provably one-shot, pre-instantiation setup (nested in a function or loop, so it can run again — after instances already exist and hot code has already compiled against them) forces V8 to deoptimize any already-optimized code that assumed the prototype chain was stable. See the rule source for the %GetOptimizationStatus evidence and reproduction command.';

/**
 * `Object.assign` / `Object.defineProperty` / `Object.defineProperties` / `Object.setPrototypeOf`,
 * resolved via `CallIdentity` (method name + `ObjectConstructor` owner from `lib.es5.d.ts` /
 * `lib.es2015.core.d.ts`), so `Object['assign'](...)` and any other spelling still resolve.
 * `assign` was previously MISSING here — `Object.assign(Foo.prototype, {...})` evaded the
 * rule entirely. See the rule source for why `Reflect`'s equivalents are NOT resolved the
 * same way.
 */
export const OBJECT_PROTOTYPE_API_METHODS: ReadonlySet<string> = new Set([
  'assign',
  'defineProperties',
  'defineProperty',
  'setPrototypeOf'
]);
export const OBJECT_PROTOTYPE_API_OWNERS: ReadonlySet<string> = new Set(['ObjectConstructor']);

/**
 * `Reflect.set` / `Reflect.setPrototypeOf` — matched by direct callee shape, NOT
 * `CallIdentity`. Verified via `checker.getResolvedSignature()`: `Reflect`'s members are
 * declared as a TypeScript `namespace` (`lib.es2015.reflect.d.ts`), not an interface, so
 * `declaration.parent` has no `.name` and `CallIdentity`'s owner-resolution step always
 * returns `undefined` for them — `CallIdentity` cannot distinguish a namespace-declared
 * built-in from a same-named user function this way. `shared/CallIdentity.ts` is owned by
 * another rule set and stable; this is a documented limitation, not a bug to route around
 * by editing it.
 */
export const REFLECT_CALLEE_NAMES: ReadonlySet<string> = new Set([
  'set',
  'setPrototypeOf'
]);
