---
"@studnicky/throttle": patch
---

`ThrottleStatsEntity`'s `adaptive` and `latency` fields declare `additionalProperties: false` on `Schema`, matching what `Node`'s closed default already derived into their static `Type`. Both are runtime-internal statistics objects `Throttle` constructs from its own typed fields, never caller input, so closing the Schema changes no real acceptance.
