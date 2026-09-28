---
"@studnicky/timing": patch
---

`TimingOptionsEntity.Node`'s `precision` field used `SchemaNode.defineDecorated`, which replaces a target's schema rather than merging it — correct for `$ref` resolution, but here it silently dropped `TimingPrecisionEntity`'s entire structural schema (`h`/`m`/`ms`/`ns`/`s`, `additionalProperties: false`) down to just `{ 'default': ... }`. `Node.schema` is live data other entities read (see `LayerOptionsEntity.Node.schema.properties`), so this is now `SchemaNode.defineAnnotated`, which layers the `default` on top of the target's full schema instead of discarding it.
