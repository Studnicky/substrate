---
"@studnicky/entity": patch
---

`@studnicky/entity`'s browser export validates schemas without constructing functions at runtime, so it works under a `script-src` Content-Security-Policy with no `unsafe-eval`. `EntityCompiler` gains a real `./node` and `./browser` split: the node path keeps Ajv's JIT compiler unchanged, and the browser path interprets JSON Schema 2020-12 through `@cfworker/json-schema`, filling declared `properties` defaults and reporting the same diagnostic shape (`keyword`, `instancePath`, `message`, `params`, `schemaPath`) as the node path. `EntityCompiler`'s public API — `compile`, `compileIntake`, `compileCreate`, `formatErrors` — is unchanged for both runtimes.
