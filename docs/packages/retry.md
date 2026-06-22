---
title: '@studnicky/retry'
description: Generic async retry with extensible error classification and backoff strategies.
---

# @studnicky/retry

> Generic async retry utility with extensible error classification.

## Install

```bash
pnpm add @studnicky/retry
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

```typescript
import { Retry, DefaultHttpErrorClassifier } from '@studnicky/retry';

// Static factory
const retry = Retry.create({ maxRetries: 3 });

// Builder
const retry2 = Retry.builder()
  .maxRetries(5)
  .errorClassifier(new DefaultHttpErrorClassifier())
  .build();

// Execute any async operation
const data = await retry.execute(async () => {
  const res = await fetch('https://api.example.com/resource');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
});
```

### With backoff interceptor

```typescript
import { Retry } from '@studnicky/retry';

const retry = Retry.builder()
  .maxRetries(4)
  .retryInterceptor((ctx) => ({
    delayMs: Math.pow(2, ctx.attemptNumber) * 100
  }))
  .build();
```

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/retry` | `Retry`, `RetryBuilder`, `DefaultHttpErrorClassifier`, `ErrorClassifier`, errors, type guards |
| `@studnicky/retry/backoff` | Backoff strategy helpers |
| `@studnicky/retry/constants` | Default configuration constants |
| `@studnicky/retry/errors` | `ConfigurationError`, `MaxRetriesExceededError`, `NonRetryableError`, `RetryError` |
| `@studnicky/retry/interfaces` | Interface types |
| `@studnicky/retry/matchers` | Error matcher utilities |
| `@studnicky/retry/types` | `BackoffStrategyType`, `ErrorClassifierFunctionType`, `RetryInterceptorType` |

## Extending

`Retry` exposes protected lifecycle hooks — override to add observability:

```typescript
import { Retry } from '@studnicky/retry';
import type { RetryContextInterface } from '@studnicky/retry';

class ObservableRetry extends Retry {
  protected override onAttempt(ctx: RetryContextInterface): void {
    metrics.increment('retry.attempt', { attempt: ctx.attemptNumber });
  }

  protected override onSuccess(ctx: RetryContextInterface): void {
    metrics.increment('retry.success');
  }

  protected override onGiveUp(ctx: RetryContextInterface, error: Error): void {
    metrics.increment('retry.exhausted');
  }
}
```

The base class never calls any logger or metrics library. All hooks are no-ops by default.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/retry)
