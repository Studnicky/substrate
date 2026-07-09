# @studnicky/retry

> Generic async retry utility with extensible error classification

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/retry)

A protocol-agnostic async retry engine with pluggable error classification and backoff, and protected lifecycle hooks for zero-cost observability via subclassing.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/retry
```

## Usage

```typescript
import { Retry, DefaultHttpErrorClassifier } from '@studnicky/retry';

const retry = Retry.builder()
  .maxRetries(3)
  .errorClassifier(new DefaultHttpErrorClassifier())
  .build();

const result = await retry.execute(() => fetch('https://api.example.com/data').then((r) => r.json()));

console.log(retry.getStats());
// { totalRequests: 1, successfulRequests: 1, failedRequests: 0, totalRetries: 2 }
```

### Backoff

Backoff has the same dual-path treatment as error classification: supply a `backoffStrategy` in config, or override the `onRetryScheduled` hook. Config takes precedence when both are present on the same instance — a subclass that overrides `onRetryScheduled` fully replaces the default body, so the config-based backoff never runs for that instance.

Config-based, using a shipped `BackoffStrategy`:

```typescript
import { Retry, BackoffStrategy } from '@studnicky/retry';

const retry = Retry.create({
  maxRetries: 3,
  backoffStrategy: { strategy: BackoffStrategy.exponential, baseDelayMs: 100 }
});
```

Subclass-override, for full control over `context.delayMs`:

```typescript
import { Retry, BackoffStrategy } from '@studnicky/retry';
import type { RetryContextType } from '@studnicky/retry';

class CustomBackoffRetry extends Retry {
  protected override onRetryScheduled(context: RetryContextType): void {
    context.delayMs = BackoffStrategy.exponentialWithJitter(context.attemptNumber, 100);
  }
}
```

### Time ceiling

`maxElapsedMs` bounds total wall-clock time across all attempts, independent of `maxRetries`. Whichever ceiling is hit first — attempt count or elapsed time — ends the retry loop, mirroring Python `tenacity`'s `stop_after_attempt(N) | stop_after_delay(T)` combined policy. Time-ceiling exhaustion is treated identically to attempt-count exhaustion: `onGiveUp` fires with `reason: 'exhausted'` and a `MaxRetriesExceededError` is thrown.

```typescript
const retry = Retry.create({
  maxRetries: 10,
  maxElapsedMs: 5000 // give up after 5s even if maxRetries hasn't been reached
});
```

Omitting `maxElapsedMs` preserves the default behavior: only `maxRetries` governs exhaustion.

## Extending

Subclass `Retry` and override any of the protected lifecycle hooks to add telemetry without changing the retry logic. All hooks are no-ops in the base class.

```typescript
import { Retry } from '@studnicky/retry';
import type { ErrorClassificationInterface, RetryConfigInterface, RetryContextType } from '@studnicky/retry';

class InstrumentedRetry extends Retry {
  readonly events: string[] = [];

  constructor(config?: Partial<RetryConfigInterface>) {
    super(config ?? {});
  }

  protected override onRetryScheduled(context: RetryContextType): void {
    this.events.push(`scheduled attempt=${context.attemptNumber} delay=${context.delayMs}ms`);
  }

  protected override onGiveUp(
    error: Error,
    attemptNumber: number,
    reason: 'aborted' | 'exhausted' | 'nonRetryable'
  ): void {
    this.events.push(`giveUp reason=${reason} attempt=${attemptNumber} err=${error.message}`);
  }
}

const retry = new InstrumentedRetry({ maxRetries: 2 });
// retry.events is populated as the FSM progresses
```

Override `classifyError` to supply domain-specific retry decisions without providing a full classifier object:

```typescript
class DatabaseRetry extends Retry {
  protected override classifyError(error: Error): ErrorClassificationInterface {
    if (error.message.includes('deadlock')) {
      return { retryable: true, reason: 'Transient deadlock' };
    }
    return { retryable: false };
  }
}
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/retry

## License

MIT
