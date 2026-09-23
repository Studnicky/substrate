---
"@studnicky/fetch": major
---

`TestDispatcher.getStats()` returns a `ReadonlyMap<string, Readonly<SocketDispatcherStatsEntity.Type>>` keyed by origin instead of an anonymous `Readonly<Record<string, unknown>>`. Callers no longer need to cast the per-origin value; read it with `.get(origin)` and check presence with `.has(origin)`.
