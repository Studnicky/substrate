---
"@studnicky/errors": patch
"@studnicky/filters": patch
"@studnicky/entity": major
"@studnicky/json": major
---

Schema-backed validation belongs to `@studnicky/entity`. Replace `SchemaValidator` imports from `@studnicky/json/node` or `@studnicky/json/browser` with `EntityCompiler` from the corresponding `@studnicky/entity` runtime entry point, and replace `SchemaIntakeError` with the entity runtime export. Replace `SchemaCreateFunctionInterface` and `SchemaIntakeFunctionInterface` imports from `@studnicky/json/interfaces` with `EntityCreateFunctionInterface` and `EntityIntakeFunctionInterface` from `@studnicky/entity/interfaces`; use `EntityValidateFunctionInterface` for compiled validators. Schema entities call `EntityCompiler.compile`, `EntityCompiler.compileIntake`, and `EntityCompiler.compileCreate`.
