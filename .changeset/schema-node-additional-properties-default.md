---
"@studnicky/entity": major
---

`SchemaNode.defineObject`'s runtime `additionalProperties` value matches its declared type default: omitting `options.additionalProperties` writes `false` into the node's `schema`, the same value `TAdditional`'s type-level default claims. The change is confined to `Node.schema`, which `EntityCompiler.compile`/`compileIntake`/`compileCreate` never read — those compile the separately hand-authored `Schema`. No shipped validator changes behavior; no entity in the workspace reads a `Node.schema.additionalProperties` value at runtime.
