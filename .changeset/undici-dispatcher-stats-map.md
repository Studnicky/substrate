---
"@studnicky/fetch": major
---

`UndiciDispatcherInterface.getStats()` and both `UndiciDispatcher` implementations (node and browser) return a `ReadonlyMap<string, Readonly<SocketDispatcherStatsEntity.Type>>` keyed by origin instead of an anonymous `Readonly<Record<string, unknown>>`. Read a value with `.get(origin)` and check presence with `.has(origin)`.
