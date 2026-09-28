---
"@studnicky/entity": major
---

`EntityCompiler.compileIntake` and `EntityCompiler.compileCreate` accept the same optional `remoteSchemas` map as `EntityCompiler.compile`, keyed by the URI a `$ref` addresses them by and resolved as if externally retrieved with no network I/O. A schema whose `$ref` addresses another document compiles through `compileIntake` and `compileCreate` exactly as it already did through `compile`. `EntityCompilerInterface` declares `remoteSchemas` on all three entry points, matching their implementations.
