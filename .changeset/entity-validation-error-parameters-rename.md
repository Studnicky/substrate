---
"@studnicky/entity": major
---

BREAKING: `EntityValidationErrorInterface`'s `params` field is renamed to `parameters`. `params` was Ajv's wire-format field name, carried over into an interface this codebase owns and Ajv no longer backs — nothing in `packages/entity` reads Ajv's `ErrorObject` anymore. `ValidationErrorFactory.build` now returns the interface directly as an object literal instead of building a loosely-typed record and asserting it through `as unknown as EntityValidationErrorInterface`. Any consumer reading `.params` off a diagnostic from `EntityCompiler.compile`/`compileIntake`/`compileCreate`'s `errors` array, or off a caught `SchemaIntakeError`, must read `.parameters` instead.
