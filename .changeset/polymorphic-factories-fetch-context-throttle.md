---
"@studnicky/fetch": minor
"@studnicky/context": minor
"@studnicky/throttle": minor
"@studnicky/request-executor": patch
---

### Changed

- `@studnicky/fetch`'s `FetchClient.create()`, `TestDispatcher.create()`, and `UndiciDispatcher.create()` return the invoking subclass's own type instead of the base class. Each already constructed the subclass via `new this(...)`; the factory now types its `this` parameter and constructs through `Reflect.construct`, so `MySubclass.create(...)` types as `MySubclass` and a subclass member is readable without a cast. A runtime guard throws a `TypeError` naming the factory if construction ever yields an instance outside the requested subclass's prototype chain. Calling the base class's `create(...)` directly is unaffected.
- `@studnicky/context`'s `Context.create()` and `@studnicky/throttle`'s `Throttle.create()` follow the same conversion. These were the last two factories in the workspace still declaring the base class as their return type.
- Subclasses across `fetch`, `request-executor`, `context`, and `throttle` drop their `static override create()` declarations. Each hardcoded `new ConcreteClass(...)` to recover the subclass type from a base-typed factory — the per-subclass workaround this conversion makes redundant, and one a properly polymorphic `create()` can no longer be validly overridden by.

`@studnicky/fetch`'s `DispatcherAgent.create()` and its browser counterpart are unchanged: they return a foreign type or throw, so they are not factories of their own class.
