---
"@studnicky/entity": major
---

`EntityCreateFunctionInterface<TStatic, TInput = TStatic>` and `EntityCompiler.compileCreate<TStatic, TInput = TStatic>` now accept a separate input type. Previously both the parameter and return type were the single, branded `TEntity`, so `create({ someConstrainedField: 0 })` was unsatisfiable for any entity with a `minimum`/`maximum`/`minLength` constraint — a hand-written literal can never carry a brand keyed by a `unique symbol` that isn't exported from its declaring module. `TInput` defaults to `TStatic`, so every existing single-argument usage keeps compiling unchanged; an entity that wants a real fix pairs `Type` with its own `NodeInputType`-derived `InputType`, the same pairing `EntityIntakeFunctionInterface` and `LruCacheOptionsEntity` already established.

`EntityIntakeFunctionInterface` and `EntityValidateFunctionInterface` were checked for the same defect and are unaffected — both already accept `unknown` on their input side.
