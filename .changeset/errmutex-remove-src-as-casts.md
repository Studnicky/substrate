---
"@studnicky/errors": patch
"@studnicky/types": patch
---

Removes every non-`as const` type assertion from `errors`/`types` source. `BaseError.toJSON()` types its assembled Problem Details object directly instead of asserting the shape at the end. `TypeGuardPredicates.isEmptyTypedArray` reads `byteLength` (present on every `ArrayBufferView`, including `DataView`) instead of casting to `Uint8Array` to read `.length`, which also fixes it reporting an empty `DataView` as non-empty. `TypeGuardPredicates.isPromise` reads the `then` member via `Reflect.get` instead of casting to `Record<string, unknown>`. `RuntimeValuePredicates.areReferenceEqual` was a hand-rolled reimplementation of `Object.is`, reachable only through a cast; `Predicates.areReferenceEqual` now binds directly to `Object.is`.
