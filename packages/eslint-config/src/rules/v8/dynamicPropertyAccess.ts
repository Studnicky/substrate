import { SelectorRule } from './SelectorRule.js';

// Scope decision: the original selector required an `ObjectExpression`
// ancestor, so it covered only computed member access lexically nested
// inside object-literal syntax — missing the overwhelming majority of real
// dynamic property access (bare `obj[key]` anywhere else in a program).
// Widened to `MemberExpression[computed=true]` with no ancestor
// requirement, so this rule is now the sole owner of the general
// "computed member access" concern — including post-creation bracket
// assignment (`const o = {}; o[key] = 1;`), which `computedObjectProperties`
// deliberately does not flag, to avoid double-reporting the same pattern
// from two rules.
//
// Literal-key exemption: NOT added. A statically-known key
// (`obj['staticName']`, `obj[42]`) still forces V8 to treat the access as a
// dynamic/megamorphic lookup rather than folding it into a monomorphic
// hidden-class transition the way a dot-access would — the engine does not
// special-case a computed access just because the key happens to be a
// literal. The pre-fix rule never exempted literals either (verified), so
// this preserves existing behavior rather than narrowing it.
export const dynamicPropertyAccess = SelectorRule.create(
  'v8Optimization/dynamicPropertyAccess',
  'MemberExpression[computed=true]',
  'Dynamic (computed) property access breaks hidden classes.'
);
