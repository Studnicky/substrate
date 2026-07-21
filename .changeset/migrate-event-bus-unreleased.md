---
"@studnicky/event-bus": major
---

### Added

- `EventBus.create<T>(config?)` is the direct construction entry point.
- `BusQueue.create<T>(options)` accepts the handler directly in its `BusQueueCreateOptionsInterface<T>` options object: `{ handler, highWaterMark?, onError?, signal? }`.
- `BusQueueCreateOptionsInterface<T>`, `EventHandlerInterface<T>`, and `UnsubscribeInterface` exported as runtime and callable contracts.

### Changed

- The package root is the sole code entrypoint for `EventBus`, `BusQueue`, and their package-owned contracts, entities, and errors.
- `EventBus` and `BusQueue` constructors are `protected`; use `EventBus.create()` / `BusQueue.create(options)` to construct instances.
- Handler callbacks receive the subscription `AbortSignal` as a second argument (`(payload, signal)`). The signal aborts when the subscriber is unsubscribed, when a caller-supplied signal aborts, or when the bus is closed. Callbacks can pass it to `fetch()` or check `signal.aborted` to cancel long-running async work.
- `BusQueue` completes `onEnqueue` and applicable `onOverflow` admission hooks before handler delivery. A rejected admission hook cancels only its item, and later enqueues continue in FIFO order.
