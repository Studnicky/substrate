---
"@studnicky/eslint-config": patch
---

`packages/eslint-config/src` no longer contains any `as unknown as` occurrence. `preferCollectionTypes.ts`, `shared/DeclaredFunctionVariable.ts`, `v8/conditionalPropertyAssignment.ts`, `v8/inlineCallablePosition.ts`, and `v8/regexpInLoops.ts` read node-type-specific fields through `AstHelpers.getNodeProperty`/`isNode` or direct field access on an already-narrowed `Rule.Node`, matching every earlier fix in this series.

`v8/conditionalPropertyAssignment.ts` converts between the loose `AstNodeInterface` bag its helpers already use throughout and real `Rule.Node` values via `Predicates.isRecord`'s type-predicate overlay (adds a real index signature to the narrowed type, since `AstNodeInterface`'s bare index signature otherwise rejects a real narrowed node on assignment) rather than retyping the file's pervasive `AstNodeInterface` usage wholesale. Its `IfStatement.alternate` read now handles the field's real `Statement | null | undefined` type — the removed cast asserted `Statement | null`, silently dropping the `undefined` case `@types/estree` actually declares.

`v8/regexpInLoops.ts`'s `#isDeclaredWithin` extracts its declaration-range comparison into `#isWithinBoundary` and its identifier-name resolution into `#identifierName`, keeping cyclomatic complexity within this package's own limit while adding the string-narrowing guard the removed cast was skipping.
