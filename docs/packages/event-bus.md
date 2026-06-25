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
| `onEnqueue(topic)` | When an event enters a subscriber queue | `topic: K` |
| `onDequeue(topic)` | When an event is dequeued for processing | `topic: K` |
| `onDrop(topic)` | When an event is dropped (queue aborted) | `topic: K` |
| `onOverflow(topic, depth)` | When backpressure begins on a subscriber queue | `topic: K`, `depth: number` |
| `onSlowConsumer(topic, depth)` | Same as onOverflow — queue reached highWaterMark | `topic: K`, `depth: number` |
| `onHandlerError(topic, error)` | When a subscriber handler throws | `topic: K`, `error: unknown` |
| `onDispose()` | When `bus.close()` is called | — |

### BusQueue hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onEnqueue(depth)` | Item added to queue | `depth: number` |
| `onDequeue(depth)` | Item removed from queue for processing | `depth: number` |
| `onDrop()` | Enqueue called on aborted queue | — |
| `onOverflow(depth)` | Queue depth reached highWaterMark | `depth: number` |
| `onSlowConsumer(depth, highWaterMark)` | Same moment as onOverflow with hwm context | `depth: number`, `highWaterMark: number` |
| `onHandlerError(error)` | Handler threw | `error: unknown` |

<<< ../../packages/event-bus/examples/observedEventBus.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## Try it

The builder demo constructs a typed `EventBus` via `EventBus.builder<AppEvents>().build()` and publishes three events across two topics. Watch each subscriber receive only the events for its topic, and note the final `drain()` call ensures all handlers complete before the bus closes.

<RunnableExample src="packages/event-bus/examples/builderEventBus" title="EventBus builder" />

The hooks demo subclasses `EventBus` and overrides seven protected lifecycle methods. Watch the full fan-out trace: `subscribe` fires once per handler registration; `publish` fires once per `bus.publish()` call; `enqueue` and `dequeue` fire once per subscriber per publish; and `deliver` fires after each handler invocation. `unsubscribe` fires for the explicit `unsub1()` call, and `dispose` fires on `bus.close()`.

<RunnableExample src="packages/event-bus/examples/observedEventBus" title="EventBus lifecycle hooks" />

## API

| Export | Type | Description |
|--------|------|-------------|
| `EventBus<TTopicMap>` | class | Multi-topic pub/sub; created via `EventBus.create<T>()` or `EventBus.builder<T>().build()` |
| `EventBusBuilder<TTopicMap>` | class | Fluent builder for `EventBus`; obtained via `EventBus.builder<T>()` |
| `BusQueue<T>` | class | Bounded FIFO queue with backpressure; created via `BusQueue.create(options)` or `BusQueue.builder<T>()` |
| `BusQueueBuilder<T>` | class | Fluent builder for `BusQueue`; obtained via `BusQueue.builder<T>()` |
| `EventHandlerType<T>` | type | `(payload: T, signal: AbortSignal) => Promise<void> \| void` |
| `UnsubscribeType` | type | `() => void` (returned by `subscribe`) |
| `BusQueueCreateOptionsType<T>` | type | `{ handler, highWaterMark?, onError?, signal? }` |

### `EventBus<TTopicMap>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `create` | `static create<T>() => EventBus<T>` | Factory; constructor is protected |
| `builder` | `static builder<T>() => EventBusBuilder<T>` | Returns a fluent builder |
| `subscribe` | `(topic, handler, options?) => UnsubscribeType` | Registers a subscriber; returns unsubscribe fn |
| `publish` | `(topic, payload) => Promise<void>` | Enqueues payload to all topic subscribers |
| `drain` | `() => Promise<void>` | Waits for all subscriber queues to empty |
| `close` | `() => Promise<void>` | Aborts all subscribers and drains |

### `BusQueue<T>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `create` | `static create<T>(options: BusQueueCreateOptionsType<T>) => BusQueue<T>` | Factory; constructor is protected |
| `builder` | `static builder<T>() => BusQueueBuilder<T>` | Returns a fluent builder |
| `enqueue` | `(item: T) => Promise<void>` | Adds item; blocks caller when at `highWaterMark` |
| `drain` | `() => Promise<void>` | Resolves when queue is empty or aborted |
| `size` | `number` | Current queue depth |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/event-bus)
