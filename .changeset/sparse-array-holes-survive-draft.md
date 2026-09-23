---
"@studnicky/json": patch
---

`Draft.produce()` preserves holes in a sparse array: mutating any part of a draft whose base contains a sparse array no longer replaces its holes with `undefined`. The internal shallow-copy step now uses `Array#slice()` instead of `Array.from()`, which preserves holes rather than densifying them. Deleting an array index inside a draft already leaves a real hole through `Reflect.deleteProperty` once the underlying copy preserves holes correctly.
