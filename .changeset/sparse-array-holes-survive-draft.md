---
"@studnicky/json": patch
---

`Draft.produce()` preserves holes in a sparse array: mutating any part of a draft whose base contains a sparse array no longer replaces its holes with `undefined`. The internal shallow-copy step now uses `Array#slice()` instead of `Array.from()`, which preserves holes rather than densifying them. Deleting an array index inside a draft leaves a real hole rather than an explicit `undefined`, via a key-projection helper instead of `Reflect.deleteProperty`.
