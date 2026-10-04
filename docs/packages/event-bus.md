---
title: "@studnicky/event-bus"
description: Typed multi-topic pub/sub with per-subscriber backpressure queues.
---

# @studnicky/event-bus

> Typed publish/subscribe with per-subscriber backpressure isolation and AbortSignal lifecycle.

## What it is

A composable, typed publish/subscribe primitive with isolated subscriber queues, explicit lifecycle, and a router for caller-provided topic selection. It coordinates messages without defining an application's event vocabulary or business process.

## What it is for

Northstar Books uses it to fan an accepted-order event to fulfilment, audit, and analytics while keeping a slow consumer from delaying the others. Consumers supply their event map, handlers, routing evidence, and queue policy; the package does not provide an order-management implementation.

## Northstar Books examples

The runnable topic-router example shows Northstar Books selecting the subscribers for a stock-change topic from caller-owned evidence, proving that routing policy remains in application composition. The runnable pub/sub example publishes a typed order event and drains its queue, proving reliable handoff to a fulfilment subscriber. The runnable lifecycle-hooks example records subscription, fan-out, delivery, unsubscription, and close events, proving that Northstar can add audit instrumentation without coupling the bus to a logging product.

## Public entrypoints

| Import path                              | Use it when                                                                                                       |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `@studnicky/event-bus/node`              | A Northstar Books server publishes or consumes typed catalogue, order, or fulfilment events.                      |
| `@studnicky/event-bus/browser`           | A browser client needs the same portable typed event contract for local UI coordination.                          |
| `@studnicky/event-bus/interfaces`        | TypeScript code accepts publishing, handling, or unsubscribe contracts without depending on a bus implementation. |
| `@studnicky/event-bus/router`            | Composition code routes selected Northstar Books topics using caller-owned matching evidence.                     |
| `@studnicky/event-bus/router/interfaces` | TypeScript code shares the router selection contract between its matcher and router boundary.                     |

## Install

```bash
pnpm add @studnicky/event-bus
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Runtime imports

Import `EventBus` from `@studnicky/event-bus/node` in Node or `@studnicky/event-bus/browser` in browsers. Import event contracts from `@studnicky/event-bus/interfaces`. Subscriber queue configuration uses `@studnicky/concurrency/queue/entities`.

## Northstar Books fulfilment events

When Northstar accepts an order, audit capture, fulfilment dispatch, and analytics each need the order event without one consumer slowing another. Publish a typed order event to the bus and give each concern its own subscription. `EventBus` guarantees typed topic payloads and independent bounded subscriber queues; a slow analytics subscriber applies backpressure only to its own queue, not to audit or fulfilment delivery.

## Usage

Subscribe to a topic, publish a payload, and drain the queue. The subscriber receives every published item:

<<< ../../packages/event-bus/examples/pubSub.ts#usage

### Multiple subscribers

All subscribers on the same topic receive each published payload independently. Calling the returned unsubscribe function removes that subscriber:

<<< ../../packages/event-bus/examples/multiSubscriber.ts#usage

### AbortSignal-based lifecycle

Pass a `signal` option to bind a subscriber's lifetime to an `AbortController`. When the signal aborts the subscriber is removed and stops receiving events. The handler also receives the subscription's own AbortSignal as a second argument; it aborts on unsubscribe, on caller-signal abort, or on bus close. Use it to cancel in-flight async work:

<<< ../../packages/event-bus/examples/abortSignal.ts#usage

## Topic routing

`TopicRouter` is the event-bus router primitive. It stores dynamic subscriptions, invokes selected handlers, and carries caller-owned selection evidence. Supply a matcher or candidate source from application composition; selection policy is not part of the router.

<RunnableExample src="packages/event-bus/examples/router-routeTopics" title="Route selected topic subscriptions" />

## Publish through a minimal sink

Components that only publish events accept `EventSinkInterface` instead of an `EventBus`. The contract contains only `publish`, so it also accepts a custom publisher without requiring subscription or lifecycle methods:

<!-- inline-ts-ok: Demonstrates a consumer-owned event map and a type-only interface import. -->

```typescript
import type { EventSinkInterface } from "@studnicky/event-bus/interfaces";

interface RetryEventsInterface {
  readonly "retry:failed": { readonly attempt: number };
}

async function recordFailure(
  sink: EventSinkInterface<RetryEventsInterface>,
  attempt: number,
): Promise<void> {
  await sink.publish("retry:failed", { attempt });
}
```

`EventBus<RetryEventsInterface>` satisfies this contract directly.

## Observability hooks

Subclass `EventBus` and override its protected hook methods to instrument pub/sub lifecycle events without modifying the base class. Use `BusQueue` from `@studnicky/concurrency/queue/node` when an application needs standalone FIFO admission.

### EventBus hooks

| Hook                           | When it fires                                                             | Args                                |
| ------------------------------ | ------------------------------------------------------------------------- | ----------------------------------- |
| `onPublish(topic, payload)`    | Once per `publish()` call, before fan-out                                 | `topic: K`, `payload: TTopicMap[K]` |
| `onSubscribe(topic)`           | When a subscriber registers                                               | `topic: K`                          |
| `onUnsubscribe(topic)`         | When a subscriber is removed                                              | `topic: K`                          |
| `onDeliver(topic, payload)`    | After each successful handler invocation                                  | `topic: K`, `payload: TTopicMap[K]` |
| `onEnqueue(topic)`             | When an event enters a subscriber queue; completes before delivery        | `topic: K`                          |
| `onDequeue(topic)`             | When an event is dequeued for processing                                  | `topic: K`                          |
| `onDrop(topic)`                | When an event is dropped (queue aborted)                                  | `topic: K`                          |
| `onOverflow(topic, depth)`     | When backpressure begins on a subscriber queue; completes before delivery | `topic: K`, `depth: number`         |
| `onHandlerError(topic, error)` | When a subscriber handler throws                                          | `topic: K`, `error: unknown`        |
| `onDispose()`                  | When `bus.close()` is called                                              | —                                   |

<<< ../../packages/event-bus/examples/observedEventBus.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## Try it

The pub/sub demo constructs a typed `EventBus` directly with `EventBus.create<AppEvents>()`, publishes an event, and drains the subscriber queue before closing.

<RunnableExample src="packages/event-bus/examples/pubSub" title="EventBus pub/sub" />

The hooks demo subclasses `EventBus` and overrides seven protected lifecycle methods. Watch the full fan-out trace: `subscribe` fires once per handler registration; `publish` fires once per `bus.publish()` call; `enqueue` and `dequeue` fire once per subscriber per publish; and `deliver` fires after each handler invocation. `unsubscribe` fires for the explicit `unsub1()` call, and `dispose` fires on `bus.close()`.

<RunnableExample src="packages/event-bus/examples/observedEventBus" title="EventBus lifecycle hooks" />

## API

| Export                          | Type                                                                                  | Description                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `EventBus<TTopicMap>`           | class                                                                                 | Multi-topic pub/sub; created via `EventBus.create<T>(config?)`                          |
| `EventHandlerInterface<T>`      | interface                                                                             | Callable handler contract: `(payload: T, signal: AbortSignal) => Promise<void> \| void` |
| `EventSinkInterface<TTopicMap>` | interface                                                                             | Minimal typed publishing contract: `publish(topic, payload) => Promise<void>`           |
| `UnsubscribeInterface`          | interface                                                                             | Callable unsubscribe contract returned by `subscribe`: `() => void`                     |
| `TopicRouter`                   | Registers topic subscriptions and publishes structural or caller-selected deliveries. | `@studnicky/event-bus/router`                                                           |
| `TopicSelectionInterface`       | Defines `{ id, origin, scores? }` selection data.                                     | `@studnicky/event-bus/router/interfaces`                                                |

### `EventBus<TTopicMap>`

| Member      | Signature                                                              | Description                                          |
| ----------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| `create`    | `static create<T>(config?: BusQueueOptionsEntity.Type) => EventBus<T>` | Constructs a bus; constructor is protected           |
| `subscribe` | `(topic, handler, options?) => UnsubscribeInterface`                   | Registers a subscriber; returns unsubscribe function |
| `publish`   | `(topic, payload) => Promise<void>`                                    | Enqueues payload to all topic subscribers            |
| `drain`     | `() => Promise<void>`                                                  | Waits for all subscriber queues to empty             |
| `close`     | `() => Promise<void>`                                                  | Aborts all subscribers and drains                    |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/event-bus)

## Exports

| Symbol                      | Purpose                                                               | Import path                       |
| --------------------------- | --------------------------------------------------------------------- | --------------------------------- |
| `EventBus`                  | Provides event bus functionality.                                     | `@studnicky/event-bus/node`       |
| `EventBusClosedError`       | Abort reason for every subscriber queue when the bus closes.          | `@studnicky/event-bus/node`       |
| `EventBusError`             | Represents event bus failures.                                        | `@studnicky/event-bus/node`       |
| `EventBusUnsubscribedError` | Abort reason for a subscriber queue when its subscription is removed. | `@studnicky/event-bus/node`       |
| `EventSinkInterface`        | Defines the minimal typed event publishing contract.                  | `@studnicky/event-bus/interfaces` |
| `EventHandlerInterface`     | Defines the event handler contract.                                   | `@studnicky/event-bus/interfaces` |
| `UnsubscribeInterface`      | Defines the unsubscribe contract.                                     | `@studnicky/event-bus/interfaces` |
