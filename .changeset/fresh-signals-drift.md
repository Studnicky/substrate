---
"@studnicky/signal": major
---

`Signal.never()` returns a fresh, independently inert `AbortSignal` on every call, so callers never share abort-listener state through one process-global signal object. `RaceTimeout.wait()` removes its abort listener on both outcomes.
