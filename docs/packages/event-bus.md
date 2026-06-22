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

```typescript
import { EventBus } from '@studnicky/event-bus';

type AppEvents = {
  'user:created': { id: string; email: string };
  'order:placed': { orderId: string; total: number };
};

const bus = EventBus.create<AppEvents>();

// Subscribe
const unsubscribe = bus.subscribe('user:created', async (payload) => {
  console.log('New user', payload.id);
});

// Publish — waits until all subscriber queues accept the item
await bus.publish('user:created', { id: '1', email: 'a@example.com' });

// Clean up one subscriber
unsubscribe();

// Drain all pending items, then close the bus
await bus.close();
```

### AbortSignal-based lifecycle

```typescript
const controller = new AbortController();

bus.subscribe('order:placed', async (payload) => {
  await processOrder(payload.orderId);
}, { signal: controller.signal });

// Subscriber stops and is removed when the signal aborts
controller.abort();
```

### BusQueue — standalone backpressure queue

```typescript
import { BusQueue } from '@studnicky/event-bus';

const queue = new BusQueue<string>(
  async (item) => { await sendEmail(item); },
  { highWaterMark: 100, onError: (err) => console.error(err) }
);

await queue.enqueue('user@example.com'); // blocks caller at highWaterMark
await queue.drain();                     // waits until queue is empty
```

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
