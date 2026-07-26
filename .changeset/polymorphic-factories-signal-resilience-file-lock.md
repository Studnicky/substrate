---
"@studnicky/signal": minor
"@studnicky/resilience": minor
"@studnicky/file-lock": minor
---

### Changed

- `@studnicky/signal`'s `Signal.create()` returns the invoking subclass's own type instead of the base class, and constructs the invoking subclass at runtime. It previously hardcoded `new Signal()`, so `MySignal.create()` returned a base `Signal` — the subclass's lifecycle-hook overrides never ran. The factory now types its `this` parameter and constructs through `Reflect.construct`, so `MySignal.create()` both types and behaves as `MySignal`. A runtime guard throws a `TypeError` naming the factory if construction ever yields an instance outside the requested subclass's prototype chain. `Signal.create()` called on the base class is unaffected.
- `@studnicky/resilience`'s `DeadLetterQueue.create()` follows the same conversion, with the identical runtime consequence: it hardcoded `new DeadLetterQueue<T>(options)`, so a subclass overriding `onEnqueue`, `onDequeue`, `onOverflow`, `onClose`, or `onAbort` was silently discarded by its own factory. `TInstance` is bounded by a new `DeadLetterQueueShapeInterface` (`abort()` and `close()` — the two public members that don't mention the queue's item type) rather than by `DeadLetterQueue<T>`, because binding to the class's own generic forces the method's unconstrained `T` to satisfy the bound and fails wherever `T` reaches a callback-shaped position.
- `@studnicky/file-lock`'s `FileLock.create()` returns the invoking subclass's own type. It already constructed the subclass via `new this(...)`, so this is a type-level correction only: `LoggedLock.create(...)` now types as `LoggedLock`, and a subclass member is readable without a cast. The factory remains `async`, and acquisition still happens after construction so the instance's protected hooks fire during it.

These factories are the only route to the protected lifecycle hooks each class documents as its extension point, so a factory that discarded the subclass contradicted the extension path.
