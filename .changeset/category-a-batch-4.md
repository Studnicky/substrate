---
"@studnicky/eslint-config": patch
---

`v8/maximumSwitchCases.ts`, `v8/memoizeArrayLength.ts` (`onAssignmentExpression`), and `v8/switchStatements.ts`'s `RuleListener` callbacks already carried the precise listener-derived parameter type and re-widened it to `Record<string, unknown>` before reading a field the parameter already exposes directly. `memoizeArrayLength.ts`'s `onLoop` matches every loop type through one shared callback, so it reads `.test` — present on `while`/`do-while`/`for` but not `for-in`/`for-of` — through `AstHelpers.getNodeProperty` instead of a cast. `v8/arraySpreadOutsideLoops.ts`'s `isBoundArrayLiteral` already narrows `parent` via a `.type` discriminant check before reading `.left`/`.right`/`.init`, fields TypeScript already exposes on the narrowed variant.

`v8/forOfArrays.ts` and `v8/arrayConcatOutsideLoops.ts` read a genuinely `Rule.Node`-shaped value from a type that doesn't carry `NodeParentExtension` — a child field (`ForOfStatement.right: Expression`, from `@types/estree` directly, not through the `RuleListener` callback parameter) and a `Scope.Reference.identifier`, respectively — and now narrow through `AstHelpers.isNode`/`getParent` instead of casting past the gap.
