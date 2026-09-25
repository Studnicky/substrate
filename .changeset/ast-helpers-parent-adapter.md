---
"@studnicky/eslint-config": patch
---

`AstHelpers` gains `isNode` and `getParent`. ESLint's traverser attaches `.parent` to every node it hands out regardless of access path — a `RuleListener` callback parameter, a `Scope.Reference.identifier`, or an arbitrary structural walk — but `@types/eslint` only types `.parent` on the `RuleListener` callback parameter via `NodeParentExtension`. `isNode` is a positive type-predicate guard (`Predicates.isRecord` plus a string `type`), and `getParent` reads `.parent` through that guard instead of asserting its presence, so a node this codebase doesn't already know carries a `NodeParentExtension` still gets a checked, not asserted, `Rule.Node | null`.
