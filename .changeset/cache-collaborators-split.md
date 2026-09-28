---
"@studnicky/cache": major
---

`LruCache.create` and its protected constructor take `(config: unknown, collaborators: LruCacheCollaboratorsInterface = {})` instead of a single pre-typed options object. `capacity`/`staleMs`/`ttlMs` go through `LruCacheOptionsEntity.intake`; `clock` is a typed collaborator passed separately and no longer duck-checked for `hrtime`/`now` at runtime. `LruCacheCreateOptionsInterface` is replaced by `LruCacheCollaboratorsInterface`, which carries only `clock`.
