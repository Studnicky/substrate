---
title: '@studnicky/mutex'
description: Key-based async mutual exclusion with queue and timeout support.
---

# @studnicky/mutex

> Key-based async mutex for preventing race conditions in concurrent operations.

## Install

```bash
pnpm add @studnicky/mutex
```

## Usage

```typescript
import { Mutex } from '@studnicky/mutex';

const mutex = Mutex.create<string>({
  maxQueueSize: 100,
  timeout: 5000
});

// Different keys run concurrently
await Promise.all([
  mutex.runExclusive('user:1', async () => resolveUser('user:1')),
  mutex.runExclusive('user:2', async () => resolveUser('user:2'))
]);

// Same key serializes
await Promise.all([
  mutex.runExclusive('user:1', async () => processFirst()),
  mutex.runExclusive('user:1', async () => processSecond()) // waits
]);
```

### Builder

```typescript
import { MutexBuilder } from '@studnicky/mutex';

const mutex = new MutexBuilder<string>()
  .timeout(3000)
  .maxQueueSize(50)
  .build();
```

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/mutex` | `Mutex`, `MutexBuilder`, errors, interfaces |
| `@studnicky/mutex/constants` | Default configuration constants |
| `@studnicky/mutex/errors` | `ConfigurationError`, `LockTimeoutError`, `QueueSizeExceededError` |
| `@studnicky/mutex/interfaces` | `MutexInterface`, `MutexConfigInterface`, `MutexStatsInterface`, `MutexObservabilityInterface` |

## Extending

```typescript
import { Mutex } from '@studnicky/mutex';

class TrackedMutex extends Mutex<string> {
  protected override onAcquire(key: string): void {
    log.debug({ key }, 'mutex acquired');
  }

  protected override onRelease(key: string): void {
    log.debug({ key }, 'mutex released');
  }

  protected override onTimeout(key: string): void {
    log.warn({ key }, 'mutex acquisition timed out');
  }
}
```

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/mutex)
