# @studnicky/event-bus

> Typed publish/subscribe with per-subscriber backpressure isolation and AbortSignal lifecycle.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/event-bus)

`EventBus` provides a typed pub/sub channel where each subscriber gets its own `BusQueue`. Slow subscribers cannot block fast ones — backpressure is isolated per queue. Subscribers opt into lifecycle management via `AbortSignal`, or can be removed by calling the unsubscribe function returned from `subscribe`.

`BusQueue` is also available standalone for any use case that needs an async, backpressure-aware single-consumer queue.

Observer failures are isolated from queue work. Synchronous throws and asynchronous rejections from `EventBus` lifecycle hooks or a standalone `BusQueue` `onError` callback do not replace the originating operation or stop later items from being processed.

A standalone `BusQueue` treats `onEnqueue` and applicable `onOverflow` hooks as admission gates. The handler receives an item only after both gates complete. A rejected admission hook cancels only that item, while later enqueues continue in FIFO order.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/event-bus
```

## Usage

### Basic pub/sub

```typescript
import type {
  UserCreatedEventEntity,
  UserDeletedEventEntity
} from './entities/UserEventEntities.js';

import { EventBus } from '@studnicky/event-bus';

interface AppEventsInterface {
  readonly 'user:created': UserCreatedEventEntity.Type;
  readonly 'user:deleted': UserDeletedEventEntity.Type;
}

const bus = EventBus.create<AppEventsInterface>();

// Optionally forward a bus-wide highWaterMark to every subscriber's BusQueue:
// const bus = EventBus.create<AppEventsInterface>({ highWaterMark: 500 });

bus.subscribe('user:created', async (payload, signal) => {
  // signal aborts when this subscriber is unsubscribed or the bus is closed.
  // Pass it to fetch() or check signal.aborted to cancel async work early.
  if (signal.aborted) { return; }
  console.log('User created:', payload.id);
});

await bus.publish('user:created', { id: '1', email: 'alice@example.com' });
await bus.drain();

await bus.close();
```

### AbortSignal unsubscription

```typescript
import { EventBus } from '@studnicky/event-bus';

interface PingEventsInterface {
  readonly 'ping': string;
}

const bus = EventBus.create<PingEventsInterface>();
const controller = new AbortController();

bus.subscribe('ping', async (payload, signal) => {
  // signal aborts when the caller's AbortController aborts, on unsubscribe(), or on close().
  if (signal.aborted) { return; }
  console.log('Received:', payload);
}, { 'signal': controller.signal });

await bus.publish('ping', 'hello');
await bus.drain();

// Abort to stop receiving future events
controller.abort();

await bus.publish('ping', 'ignored');
await bus.drain();

await bus.close();
```

### `BusQueue` standalone usage

```typescript
import { BusQueue } from '@studnicky/event-bus';

const queue = BusQueue.create<string>({
  handler: async (item) => {
    console.log('Processing:', item);
  },
  highWaterMark: 10
});

await queue.enqueue('task-1');
await queue.enqueue('task-2');
await queue.drain();

console.log('Queue depth:', queue.size);
```

## License

MIT
