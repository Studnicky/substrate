# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `BusQueue<T>` — bounded async FIFO queue with configurable `highWaterMark` backpressure. `enqueue()` blocks the caller when the queue is at capacity; the handler runs sequentially via a microtask-scheduled drain loop. Supports `AbortSignal` for cancellation and an `onError` callback so handler errors do not halt delivery.
- `EventBus<TTopicMap>` — typed multi-topic pub/sub. Each subscriber receives its own `BusQueue` so backpressure and errors are isolated per subscriber. `subscribe()` returns an `UnsubscribeFn`; `publish()` fans out to all registered subscribers on the topic. `drain()` awaits all in-flight queues; `close()` aborts all subscriber queues and drains. Constructed via `EventBus.create<TTopicMap>()`.
