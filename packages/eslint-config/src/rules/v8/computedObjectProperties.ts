import { SelectorRule } from './SelectorRule.js';

// Scope decisions:
// - Narrowed `ObjectExpression Property[computed=true]` (a descendant
//   combinator) to `ObjectExpression > Property[computed=true]` (a direct
//   child). The descendant form also matched computed properties belonging
//   to an unrelated, more deeply nested `ObjectExpression`/`ObjectPattern`
//   reached only via ancestor-descendant traversal (e.g. a computed
//   destructuring-pattern property inside a method/arrow body nested in the
//   object literal) — none of that concerns the enclosing object literal's
//   own hidden-class shape, so it was a false positive.
// - `Object.fromEntries([[key, 1]])` IS in scope: kept in this rule because
//   it produces the same dynamic-shape object-literal-equivalent result via
//   a different API surface, which is exactly this rule's concern (object
//   creation with a non-statically-known shape).
// - Post-creation bracket assignment (`const o = {}; o[key] = 1;`) is
//   deliberately NOT covered here — that is a computed MemberExpression
//   write, which is `dynamicPropertyAccess`'s territory now that its
//   selector was widened to `MemberExpression[computed=true]`. Covering it
//   in both rules would double-report the same statement.
export const computedObjectProperties = SelectorRule.create(
  'v8Optimization/computedObjectProperties',
  'ObjectExpression > Property[computed=true], CallExpression[callee.object.name="Object"][callee.property.name="fromEntries"]',
  'Computed properties in object literals break hidden classes.'
);
