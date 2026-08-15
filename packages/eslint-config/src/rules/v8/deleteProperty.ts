import { SelectorRule } from './SelectorRule.js';

// Three equivalent forms are matched:
// - `delete obj.x` / `delete obj['x']` — argument is a plain MemberExpression.
// - `delete obj?.x` — optional chaining wraps the MemberExpression in a
//   ChainExpression, so `argument.type` is "ChainExpression"; unwrap to its
//   inner `.expression` and require that to be a MemberExpression.
// - `Reflect.deleteProperty(obj, 'x')` — same effect via a CallExpression
//   rather than a `delete` UnaryExpression.
export const deleteProperty = SelectorRule.create(
  'v8Optimization/deleteProperty',
  'UnaryExpression[operator="delete"][argument.type="MemberExpression"], UnaryExpression[operator="delete"][argument.type="ChainExpression"][argument.expression.type="MemberExpression"], CallExpression[callee.object.name="Reflect"][callee.property.name="deleteProperty"]',
  'delete on member expressions is forbidden. It breaks V8 optimizations.'
);
