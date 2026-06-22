---
title: '@studnicky/throttle'
description: Sliding-window concurrency throttle with adaptive limits and abort support.
---

# @studnicky/throttle

> Generic async operation throttle with sliding window concurrency control.

## Install

```bash
pnpm add @studnicky/throttle
```

## Usage

```typescript
import { Throttle } from '@studnicky/throttle';

// Default: 10 concurrent operations
const throttle = new Throttle();

// Or configure explicitly
const throttle2 = Throttle.create({ concurrencyLimit: 5 });

const results = await Promise.all(
  urls.map(url => throttle.execute(async () => fetch(url)))
);
```

### Abort support

```typescript
const throttle = Throttle.create({ concurrencyLimit: 3 });

// Queued operations resolve with undefined, active ones continue silently
await throttle.abort();
```

### Builder

```typescript
import { ThrottleBuilder } from '@studnicky/throttle';

const throttle = new ThrottleBuilder()
  .concurrencyLimit(8)
  .build();
```

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/throttle` | `Throttle`, `ThrottleBuilder`, errors, interfaces, type guards |
| `@studnicky/throttle/constants` | Default configuration constants |
| `@studnicky/throttle/errors` | `ConfigurationError`, `ThrottleAbortedError`, `ThrottleDrainingError` |
| `@studnicky/throttle/interfaces` | Interface types |
| `@studnicky/throttle/types` | `AdaptiveConfigInputType` |

## Extending

```typescript
import { Throttle } from '@studnicky/throttle';

class TracedThrottle extends Throttle {
  protected override onExecuteStart(): void {
    metrics.gauge('throttle.active', this.stats.activeCount);
  }

  protected override onExecuteComplete(): void {
    metrics.gauge('throttle.active', this.stats.activeCount);
  }
}
```

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/throttle)
