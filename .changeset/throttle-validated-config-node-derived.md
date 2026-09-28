---
"@studnicky/throttle": major
---

`ValidatedAdaptiveConfigEntity` and `ValidatedThrottleConfigEntity` now derive `Type` from a `SchemaNode`-built `Node` (`NodeStaticType<typeof Node>`) instead of `json-schema-to-ts`'s `FromSchema`. `Type` values now carry constraint brands (e.g. `ApplyNumberConstraintBrandsType<{minimum: 1}>`); a plain unvalidated `number` no longer satisfies a branded field. Both entities export `InputType` (`NodeInputType<typeof Node>`) for callers assembling unvalidated data, and `create` now accepts `Partial<InputType>` and returns the branded `Type`.

`ValidatedAdaptiveConfigEntity`'s `enabled`-discriminated `anyOf` restates every field as a complete, self-contained branch (rather than a base schema refined per branch): `defineAnyOf`'s derived static type reflects only the union of its branches' own shapes, with no mechanism to intersect a sibling schema into it.

`Throttle`'s internal construction of `ValidatedAdaptiveConfigEntity.Type`/`ValidatedThrottleConfigEntity.Type` values now routes through each entity's `create()` rather than hand-built object literals, and concurrency-limit adjustment rebuilds `this.config` through `ValidatedThrottleConfigEntity.create()` instead of mutating a branded field in place.
