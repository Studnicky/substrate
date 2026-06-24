---
title: '@studnicky/event-bus'
description: Typed multi-topic pub/sub with per-subscriber backpressure queues.
---

# @studnicky/event-bus

> Typed publish/subscribe with per-subscriber backpressure isolation and AbortSignal lifecycle.

## Install

```bash
pnpm add @studnicky/event-bus
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

Subscribe to a topic, publish a payload, and drain the queue. The subscriber receives every published item:

<<< ../../packages/event-bus/examples/pubSub.ts#usage

### Multiple subscribers

All subscribers on the same topic receive each published payload independently. Calling the returned unsubscribe function removes that subscriber:

<<< ../../packages/event-bus/examples/multiSubscriber.ts#usage

### AbortSignal-based lifecycle

Pass a `signal` option to bind a subscriber's lifetime to an `AbortController`. When the signal aborts the subscriber is removed and stops receiving events:

<<< ../../packages/event-bus/examples/abortSignal.ts#usage

## API

| Export | Type | Description |
|--------|------|-------------|
| `EventBus<TTopicMap>` | class | Multi-topic pub/sub; created via `EventBus.create<T>()` |
| `BusQueue<T>` | class | Bounded FIFO queue with backpressure; used internally per subscriber |
| `EventHandlerType<T>` | type | `(payload: T) => Promise<void> \| void` |
| `UnsubscribeType` | type | `() => void` — returned by `subscribe` |
| `BusQueueOptionsType` | type | `{ highWaterMark?, onError?, signal? }` |

### `EventBus<TTopicMap>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `create` | `static create<T>() => EventBus<T>` | Factory; constructor is private |
| `subscribe` | `(topic, handler, options?) => UnsubscribeType` | Registers a subscriber; returns unsubscribe fn |
| `publish` | `(topic, payload) => Promise<void>` | Enqueues payload to all topic subscribers |
| `drain` | `() => Promise<void>` | Waits for all subscriber queues to empty |
| `close` | `() => Promise<void>` | Aborts all subscribers and drains |

### `BusQueue<T>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `(handler, options?)` | Accepts handler and optional `BusQueueOptionsType` |
| `enqueue` | `(item: T) => Promise<void>` | Adds item; blocks caller when at `highWaterMark` |
| `drain` | `() => Promise<void>` | Resolves when queue is empty or aborted |
| `size` | `number` | Current queue depth |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/event-bus)
