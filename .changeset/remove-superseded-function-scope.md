---
"@studnicky/eslint-config": patch
---

`v8/functionScope.ts` and `v8/constants/FunctionScopeConstants.ts` are removed. `FunctionScope.isInsideLoop` stops at any function boundary with no exception, so a scan inside a `.forEach()` callback goes undetected; `LoopContext.isPerIteration` (already the loop-detection primitive every active rule uses) checks a function boundary against `CallIdentity.isBuiltinCall` for exactly that per-element-iteration-callback case before giving up, and correctly flags it. `FunctionScope.isRebuiltInFunctionScope`'s narrower concern — whether a value is constructed once per class versus once per instance — is superseded by `RecurringScope.isProvablyOneShot`, already used by `objectSpread.ts` and `prototypeModification.ts`. Neither `FunctionScope` method has a caller anywhere in the workspace; the deletion follows a confirmed supersession, not a guess.
