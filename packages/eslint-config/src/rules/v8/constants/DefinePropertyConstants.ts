/** Data constants for the `define-property` rule: rule name, violation message, and the `CallIdentity` match target for `Object.defineProperty`. */

export const RULE_NAME = 'v8Optimization/defineProperty';

export const MESSAGE = 'Object.defineProperty() redefines a property already established earlier in this scope, or installs an accessor (get/set) descriptor. Both are measured hazards — see the rule source for the %HasFastProperties/%HaveSameMap evidence. A FRESH definition of a property that has never been set before is exempt: measured fast and shape-uniform.';

/**
 * `Object.defineProperty` resolved via `CallIdentity` rather than `callee.property.name`,
 * so `Object['defineProperty'](...)` and any other spelling still resolve. Verified via
 * `checker.getResolvedSignature()`: the declaration comes from `lib.es5.d.ts`, method name
 * `defineProperty`, owner interface `ObjectConstructor`.
 */
export const DEFINE_PROPERTY_METHODS: ReadonlySet<string> = new Set(['defineProperty']);
export const DEFINE_PROPERTY_OWNERS: ReadonlySet<string> = new Set(['ObjectConstructor']);
