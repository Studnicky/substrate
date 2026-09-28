---
"@studnicky/eslint-config": patch
---

`exportShape`'s `ListenerMerge.combine` merges two rule listener maps by making `dispatch`'s node parameter generic instead of hard-coding it to `Rule.Node`, so each of seven listener keys infers its own precise ESTree node type and needs no cast at all. `TSExportAssignment` has no named property on `@types/eslint`'s `Rule.RuleListener` — it resolves through the catch-all index signature, whose `.type` discriminant TypeScript cannot unify across that signature's ~75 unrelated handler shapes — and `@typescript-eslint/utils`'s own precisely-typed `RuleListener` fails the same assignment one key over, since its `AST_NODE_TYPES.Program` enum discriminant is a different type from `@types/eslint`'s plain `"Program"` string literal on every other key. That one key keeps two single-step `as` assertions, scoped to reading its two listener functions; every other cast in this merge is gone.
