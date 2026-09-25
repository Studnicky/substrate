---
"@studnicky/eslint-config": patch
---

`v8/functionScope.ts`'s `isRebuiltInFunctionScope` already narrows `current` to `PropertyDefinition` via a `.type` discriminant check before reading `.static`, a real field on that variant TypeScript already exposes after the check — no cast needed. `v8/inlineArrowFunctions.ts`'s `RuleListener['ArrowFunctionExpression']` callback already carries `ArrowFunctionExpression`'s real `.body` field. `inlineTrivialLogic.ts`'s `#findContainingClass` walks two real `.parent` links (both directly typed, non-`unknown`, on every `Rule.Node`) instead of casting each hop to an anonymous `{ parent?: unknown }`; `#collectHeritageExpressions` reads `superClass`/`implements`/`.expression` — fields specific to a subset of node types, on a parameter typed for the full `Rule.Node` union — through `AstHelpers.getNodeProperty`/`isNode` instead of three single-field casts.
