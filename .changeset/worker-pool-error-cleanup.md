---
"@studnicky/concurrency": patch
---

A worker that raises `'error'` leaves the pool immediately instead of remaining listed until its separate `'exit'` event arrives. Between those two events a crashed worker stayed assignable: one that errored while idle could be handed a new task, and a shutdown sweep could terminate it a second time. Pools observing `terminate()` call counts see one call per worker rather than an extra, timing-dependent one. A worker whose record is already gone can no longer rejoin the idle pool, and a replacement worker spawns only when queued work is waiting for it.
