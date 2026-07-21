# Changelog

## 7.0.1

### Patch Changes

- @studnicky/circular-buffer@7.0.1
- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/circular-buffer@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `EventBus.create<T>(config?)` is the direct construction entry point.
- `BusQueue.create<T>(options)` accepts the handler directly in its `BusQueueCreateOptionsInterface<T>` options object: `{ handler, highWaterMark?, onError?, signal? }`.
- `BusQueueCreateOptionsInterface<T>`, `EventHandlerInterface<T>`, and `UnsubscribeInterface` exported as runtime and callable contracts.

### Changed

- The package root is the sole code entrypoint for `EventBus`, `BusQueue`, and their package-owned contracts, entities, and errors.
- `EventBus` and `BusQueue` constructors are `protected`; use `EventBus.create()` / `BusQueue.create(options)` to construct instances.
- Handler callbacks receive the subscription `AbortSignal` as a second argument (`(payload, signal)`). The signal aborts when the subscriber is unsubscribed, when a caller-supplied signal aborts, or when the bus is closed. Callbacks can pass it to `fetch()` or check `signal.aborted` to cancel long-running async work.
- `BusQueue` completes `onEnqueue` and applicable `onOverflow` admission hooks before handler delivery. A rejected admission hook cancels only its item, and later enqueues continue in FIFO order.

## [1.0.0] - 2026-06-22

### Added

- `BusQueue<T>` — bounded async FIFO queue with configurable `highWaterMark` backpressure. `enqueue()` blocks the caller when the queue is at capacity; the handler runs sequentially via a microtask-scheduled drain loop. Supports `AbortSignal` for cancellation and an `onError` callback so handler errors do not halt delivery.
- `EventBus<TTopicMap>` — typed multi-topic pub/sub. Each subscriber receives its own `BusQueue` so backpressure and errors are isolated per subscriber. `subscribe()` returns an `UnsubscribeFn`; `publish()` fans out to all registered subscribers on the topic. `drain()` awaits all in-flight queues; `close()` aborts all subscriber queues and drains. Constructed via `EventBus.create<TTopicMap>()`.
