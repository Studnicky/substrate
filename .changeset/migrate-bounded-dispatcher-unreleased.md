---
"@studnicky/bounded-dispatcher": major
---

### Added

- `BoundedDispatcher` class composing `@studnicky/concurrency`'s `Semaphore`, `@studnicky/event-bus`, and `@studnicky/scheduler` into the "bounded work dispatch" pattern: `dispatch(fn)` acquires a semaphore permit, runs `fn`, and publishes `'dispatch'` lifecycle events (`start` / `success` / `error`) onto the composed `EventBus`; `scheduleDispatch(atMs, fn)` layers a scheduler-driven delayed dispatch on top, returning the scheduler's own cancellable task handle.
- `BoundedDispatcherConfigInterface`, `BoundedDispatcherTopicMapInterface`, `BoundedDispatcherStartEventInterface`, `BoundedDispatcherSuccessEventInterface`, and `BoundedDispatcherErrorEventInterface` are public runtime contracts. The dispatch interfaces compose their phase discriminants from `BoundedDispatcherStartEventEntity`, `BoundedDispatcherSuccessEventEntity`, and `BoundedDispatcherErrorEventEntity`.
- `getBus()` exposes the typed dispatch event bus for subscriptions and domain-specific bus behavior.
- `hookErrorCount` and `getHookErrors()` expose rejected non-blocking lifecycle publications as deeply defensive `HookInvocationError` snapshots without changing the dispatched work's result or error.
