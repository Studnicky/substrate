---
"@studnicky/entity": major
---

New `SchemaNode.defineDecorated<TSchema, TTarget>(schema, target)` wraps an already-built node with sibling schema keys — such as a `default` — without restating the target's shape: the derived type reads `target`'s own precomputed `static`/`input` directly, the same indexed-access rule every other constructor follows, while `schema` carries only the decoration. This closes the third shape of the `Node`/`Schema` default-derivation gap: a `default` attached by wrapping a *referenced* node (rather than composed inline at a `defineEnum`/`defineOneOf`/etc. call site) previously had no constructor call site to carry it, so `InferDefaultBearingKeysType` could not see it.

`SchemaNode.defineReference` is now a thin specialisation of `defineDecorated` — `defineDecorated({ '$ref': pointer, 'title': title }, target)` — rather than a second, parallel implementation of the same "wrap, don't restate" judgement; its own behavior and public signature are unchanged.

`TimingOptionsEntity.ts`'s `precision` field, previously `TimingPrecisionEntity.Node` used as-is with its `default` living only in the hand-authored `Schema`, is converted to `SchemaNode.defineDecorated({ 'default': DEFAULT_DECIMAL_PRECISION } as const, TimingPrecisionEntity.Node)`. Runtime behavior is unchanged — `Schema` already drove the compiler and already carried this default — but `TimingOptionsEntity.Type['precision']` is now correctly derived as present rather than optional, which also resolves five previously-spurious `possibly undefined` type errors in `Timing.ts`'s direct `timingOptions.precision.*` reads.
