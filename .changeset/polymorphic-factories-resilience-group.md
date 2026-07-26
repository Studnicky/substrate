---
"@studnicky/resilience": minor
"@studnicky/scheduler": minor
"@studnicky/concurrency": minor
"@studnicky/event-bus": minor
"@studnicky/memoize": minor
---

### Changed

- `@studnicky/resilience`'s `CircuitBreaker.create()` and `TokenBucket.create()` return the invoking subclass's own type instead of the base class. Each already constructed the subclass at runtime via `new this(...)`; the factory now types its `this` parameter and constructs through `Reflect.construct`, so `MySubclass.create(...)` types as `MySubclass` and a subclass member is readable without a cast. A runtime guard throws a `TypeError` naming the factory if construction ever yields an instance outside the requested subclass's prototype chain. Calling `Base.create(...)` directly is unaffected — it still types as `Base`.
- `@studnicky/scheduler`'s `MinimumHeap.create()`, `VirtualScheduler.create()`, and `RealTimeScheduler.create()` follow the same subclass-return pattern.
- `@studnicky/concurrency`'s `Semaphore.create()` follows the same subclass-return pattern. `Channel.create<T>()` and `Coalesce.create<T>()` follow it too, with `TInstance` bounded by a new `ChannelShapeInterface`/`CoalesceShapeInterface` (each just the one public member — `close()`, `isInflight()` — that doesn't mention the class's own item-type parameter) rather than by `Channel<T>`/`Coalesce<T>` directly: binding to the class's own generic type forces the method's general, unconstrained `T` to satisfy the bound, which fails the moment `T` appears in a callback-shaped (contravariant) position. The narrower bound still proves the returned value is shaped like the base class, without that failure mode.
- `@studnicky/event-bus`'s `BusQueue.create<T>()` and `EventBus.create<TTopicMap>()` follow the same shape-interface-bounded pattern (`BusQueueShapeInterface`/`EventBusShapeInterface`, each the type-parameter-independent `drain()`/`close()` members). `EventBus.loop.spec.ts`, `BusQueue.loop.spec.ts`, and `examples/observedEventBus.ts` drop twelve `static override create()` overrides that hardcoded `new ConcreteClass(...)` — the pre-existing per-subclass workaround this conversion makes redundant, and one a properly polymorphic `create()` can no longer be validly overridden by.
- `@studnicky/memoize`'s `Memoize.create<TArgs, TResult>()` follows the same shape-interface-bounded pattern (`MemoizeShapeInterface`, just `clear()`, the one public member independent of `TArgs`/`TResult`) in place of the `TInstance extends Memoize<TArgs, TResult>` bound it carried since its own original conversion — that bound hit the identical failure the moment `TArgs` (a rest-tuple parameter of the memoized function, a callback-shaped position) was inferred from an unannotated callback. `memoize.loop.spec.ts` adds an explicit parameter type to four memoized-function literals that previously relied on inference collapsing correctly by accident.
