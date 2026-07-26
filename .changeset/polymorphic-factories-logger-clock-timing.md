---
"@studnicky/logger": minor
"@studnicky/clock": minor
"@studnicky/timing": minor
---

### Changed

- `@studnicky/logger`'s `Logger.create()`, `ConsoleTransport.create()`, `MemoryTransport.create()`, `NoOpTransport.create()`, and `FunctionTransport.create()` return the invoking subclass's own type instead of the base class. Each already constructed the subclass at runtime via `new this(...)`; the factory now types its `this` parameter and constructs through `Reflect.construct`, so `MySubclass.create(...)` types as `MySubclass` and a subclass member is readable without a cast. A runtime guard throws a `TypeError` naming the factory if construction ever yields an instance outside the requested subclass's prototype chain. Calling `Base.create(...)` directly is unaffected — it still types as `Base`.
- `@studnicky/clock`'s `Clock.create()`, `RealTimeClockProvider.create()`, `VirtualClockProvider.create()`, and `VirtualTimeCounter.create()` follow the same subclass-return pattern.
- `@studnicky/timing`'s `Timing.create()` and `NoOpTiming.create()` follow the same subclass-return pattern.
