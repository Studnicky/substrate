---
"@studnicky/signal": major
"@studnicky/fetch": patch
"@studnicky/health-registry": patch
"@studnicky/mutex": patch
"@studnicky/request-executor": patch
"@studnicky/resilience": patch
"@studnicky/worker-pool": patch
---

`Signal.compose()` returns a disposable composed-signal handle with a `signal` property. The handle cancels pending deadline timers, removes listeners, and disposes automatically when its signal aborts; callers dispose it with explicit resource management or `dispose()` when the operation ends.`
