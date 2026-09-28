---
"@studnicky/cache": major
---

`LruCacheNodeTimingEntity.create` accepts `LruCacheNodeTimingEntity.InputType` — plain, unbranded numbers for `expiresAt`/`staleAt` — instead of demanding the branded `minimum`-constrained `Type`, which no caller outside the compiler could construct.
