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

Pass a `signal` option to bind a subscriber's lifetime to an `AbortController`. When the signal aborts the subscriber is removed and stops receiving events. The handler also receives the subscription's own AbortSignal as a second argument; it aborts on unsubscribe, on caller-signal abort, or on bus close. Use it to cancel in-flight async work:

<<< ../../packages/event-bus/examples/abortSignal.ts#usage

## Observability hooks

Subclass `EventBus` or `BusQueue` and override any of the protected hook methods to instrument lifecycle events without modifying the base class.

### EventBus hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onPublish(topic, payload)` | Once per `publish()` call, before fan-out | `topic: K`, `payload: TTopicMap[K]` |
| `onSubscribe(topic)` | When a subscriber registers | `topic: K` |
| `onUnsubscribe(topic)` | When a subscriber is removed | `topic: K` |
| `onDeliver(topic, payload)` | After each successful handler invocation | `topic: K`, `payload: TTopicMap[K]` |
| `onEnqueue(topic)` | When an event enters a subscriber queue; completes before delivery | `topic: K` |
| `onDequeue(topic)` | When an event is dequeued for processing | `topic: K` |
| `onDrop(topic)` | When an event is dropped (queue aborted) | `topic: K` |
| `onOverflow(topic, depth)` | When backpressure begins on a subscriber queue; completes before delivery | `topic: K`, `depth: number` |
| `onHandlerError(topic, error)` | When a subscriber handler throws | `topic: K`, `error: unknown` |
| `onDispose()` | When `bus.close()` is called | — |

### BusQueue hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onEnqueue(depth)` | Admission gate after the item is added; completes before handler delivery | `depth: number` |
| `onDequeue(depth)` | Item removed from queue for processing | `depth: number` |
| `onDrop()` | Enqueue called on aborted queue | — |
| `onOverflow(depth)` | Admission gate when queue depth reaches highWaterMark; completes before handler delivery | `depth: number` |
| `onHandlerError(error)` | Handler threw | `error: unknown` |

<<< ../../packages/event-bus/examples/observedEventBus.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

For standalone `BusQueue` subclasses, a rejection from `onEnqueue` or `onOverflow` cancels only that item. The queue skips the cancelled entry and continues later enqueues in FIFO order.

## Try it

The pub/sub demo constructs a typed `EventBus` directly with `EventBus.create<AppEvents>()`, publishes an event, and drains the subscriber queue before closing.

<RunnableExample src="packages/event-bus/examples/pubSub" title="EventBus pub/sub" />

The hooks demo subclasses `EventBus` and overrides seven protected lifecycle methods. Watch the full fan-out trace: `subscribe` fires once per handler registration; `publish` fires once per `bus.publish()` call; `enqueue` and `dequeue` fire once per subscriber per publish; and `deliver` fires after each handler invocation. `unsubscribe` fires for the explicit `unsub1()` call, and `dispose` fires on `bus.close()`.

<RunnableExample src="packages/event-bus/examples/observedEventBus" title="EventBus lifecycle hooks" />

## API

| Export | Type | Description |
|--------|------|-------------|
| `EventBus<TTopicMap>` | class | Multi-topic pub/sub; created via `EventBus.create<T>(config?)` |
| `BusQueue<T>` | class | Bounded FIFO queue with backpressure; created via `BusQueue.create(options)` |
| `EventHandlerInterface<T>` | interface | Callable handler contract: `(payload: T, signal: AbortSignal) => Promise<void> \| void` |
| `UnsubscribeInterface` | interface | Callable unsubscribe contract returned by `subscribe`: `() => void` |
| `BusQueueCreateOptionsInterface<T>` | interface | Queue construction contract: `{ handler, highWaterMark?, onError?, signal? }` |
| `BusQueueOptionsEntity` | entity | Schema-backed bus and subscriber queue options |

### `EventBus<TTopicMap>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `create` | `static create<T>(config?: BusQueueOptionsEntity.Type) => EventBus<T>` | Constructs a bus; constructor is protected |
| `subscribe` | `(topic, handler, options?) => UnsubscribeInterface` | Registers a subscriber; returns unsubscribe function |
| `publish` | `(topic, payload) => Promise<void>` | Enqueues payload to all topic subscribers |
| `drain` | `() => Promise<void>` | Waits for all subscriber queues to empty |
| `close` | `() => Promise<void>` | Aborts all subscribers and drains |

### `BusQueue<T>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `create` | `static create<T>(options: BusQueueCreateOptionsInterface<T>) => BusQueue<T>` | Factory; constructor is protected |
| `enqueue` | `(item: T) => Promise<void>` | Adds item; awaits admission hooks and blocks caller when at `highWaterMark` |
| `drain` | `() => Promise<void>` | Resolves when queue is empty or aborted |
| `size` | `number` | Current queue depth |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/event-bus)
