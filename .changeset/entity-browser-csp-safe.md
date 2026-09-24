---
"@studnicky/entity": major
---

`@studnicky/entity` validates JSON Schema 2020-12 through a specialised-closure engine on both the `./node` and `./browser` exports. Neither path constructs a function at runtime, so both work under a `script-src` Content-Security-Policy with no `unsafe-eval`. The `ajv`, `ajv-formats` and `@cfworker/json-schema` dependencies are removed.

Both exports share one engine, so they report identical results and an identical diagnostic shape (`keyword`, `instancePath`, `message`, `params`, `schemaPath`) for every schema and instance. `EntityCompiler`'s public API — `compile`, `compileIntake`, `compileCreate`, `formatErrors` — is unchanged.
