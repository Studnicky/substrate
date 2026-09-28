/** Data constants for the `define-property` rule: rule name, violation message, and the `CallIdentity` match target for `Object.defineProperty`. */

export const RULE_NAME = 'v8Optimization/defineProperty';

export const MESSAGE = 'Object.defineProperty() redefines a property already established earlier in this scope, or installs an accessor (get/set) descriptor. Both are measured hazards — see the rule source for the %HasFastProperties/%HaveSameMap evidence. A FRESH definition of a property that has never been set before is exempt: measured fast and shape-uniform.';

// Resolved via CallIdentity, not callee.property.name, so `Object['defineProperty'](...)` also matches.
export const DEFINE_PROPERTY_METHODS: ReadonlySet<string> = new Set(['defineProperty']);
export const DEFINE_PROPERTY_OWNERS: ReadonlySet<string> = new Set(['ObjectConstructor']);
