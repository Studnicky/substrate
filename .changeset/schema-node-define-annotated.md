---
"@studnicky/entity": minor
---

`SchemaNode` gains `defineAnnotated`, layering sibling schema keys (e.g. `default`) onto a target node's own schema without discarding it. `defineDecorated` replaces the target's schema entirely — correct for `$ref`/`$defs` resolution, where inlining a recursive target would recurse forever — but that made it the wrong tool for attaching an annotation to a non-recursive node while keeping its full structural schema, which is what `defineAnnotated` is for.
