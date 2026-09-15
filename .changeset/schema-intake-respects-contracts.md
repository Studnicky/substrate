---
"@studnicky/errors": patch
"@studnicky/entity": major
"@studnicky/json": patch
---

Schema intake preserves schema-defined additional-property rules and keeps caller input unchanged. `@studnicky/entity` replaces `@studnicky/intake-kit`; update runtime imports to `@studnicky/entity/node` or `@studnicky/entity/browser`, and rename `IntakeCompiler` to `EntityCompiler`. The entity package provides strict create and intake compilation that rejects undeclared properties at both entry points.
