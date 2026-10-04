# @studnicky/event-bus

> Typed publish/subscribe with per-subscriber backpressure isolation and AbortSignal lifecycle.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/event-bus)

`EventBus` provides typed pub/sub with one independently backpressured subscriber queue per subscription. Slow subscribers cannot block fast ones. Subscribers opt into lifecycle management via `AbortSignal`, or can be removed by calling the returned unsubscribe function.

`EventBus` delegates FIFO admission to `BusQueue` from `@studnicky/concurrency/queue/node`. Observer failures are isolated from pub/sub delivery and do not replace the originating operation or stop later messages.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/event-bus
```

## Runtime imports

Import `EventBus` from `@studnicky/event-bus/node` in Node or `@studnicky/event-bus/browser` in browsers. Import contracts from `@studnicky/event-bus/interfaces`. Queue configuration comes from `@studnicky/concurrency/queue/entities`.

## Usage

### Basic pub/sub

```typescript
import type {
  UserCreatedEventEntity,
  UserDeletedEventEntity
} from './entities/UserEventEntities.js';

import { EventBus } from '@studnicky/event-bus/node';

interface AppEventsInterface {
  readonly 'user:created': UserCreatedEventEntity.Type;
  readonly 'user:deleted': UserDeletedEventEntity.Type;
}

const bus = EventBus.create<AppEventsInterface>();

// Optionally forward a bus-wide highWaterMark to every subscriber queue:
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
import { EventBus } from '@studnicky/event-bus/node';

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

### Publish through a minimal sink

A component that only publishes events can depend on `EventSinkInterface` instead of the full bus lifecycle. `EventBus` and custom publishers both satisfy this contract:

```typescript
import type { EventSinkInterface } from '@studnicky/event-bus/interfaces';

interface RetryEventsInterface {
  readonly 'retry:failed': { readonly attempt: number };
}

async function recordFailure(
  sink: EventSinkInterface<RetryEventsInterface>,
  attempt: number
): Promise<void> {
  await sink.publish('retry:failed', { attempt });
}
```

Standalone FIFO admission uses `BusQueue` from `@studnicky/concurrency/queue/node`.

## License

MIT
