---
"@studnicky/memoize": major
---

`Memoize.create` takes `(callback, config: unknown, collaborators: MemoizeCollaboratorsInterface)` instead of `(callback, options)`. `capacity`/`staleMs`/`ttlMs` forward to `LruCache.create`'s own schema intake; `keyDeriver` is a required typed collaborator, passed separately. `MemoizeOptionsInterface` is replaced by `MemoizeCollaboratorsInterface`, which carries only `keyDeriver`.
