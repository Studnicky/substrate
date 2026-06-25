---
title: Getting Started
description: Install and use @studnicky/substrate packages in a Node.js project.
---

# Getting Started

## Requirements

- Node.js 24 or later
- pnpm (or npm/yarn)

## Installing from GitHub Packages

Packages are published to the GitHub Package Registry under the `@studnicky` scope. Add the registry to your `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

Then install any package:

```bash
pnpm add @studnicky/retry
```

## Minimal usage example

<!-- inline-ts-ok: consumer-facing snippet using the published @studnicky/retry import and live fetch; illustrates install-and-use ergonomics, not an in-repo runnable example (those use relative ../src imports) -->
```typescript
import { Retry } from '@studnicky/retry';

// Create via static factory
const retry = Retry.create({ maxRetries: 3 });

// Or use the fluent builder
const retryWithClassifier = Retry.builder()
  .maxRetries(5)
  .build();

// Execute any async operation with automatic retry
const result = await retry.execute(async () => {
  const response = await fetch('https://api.example.com/data');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
});
```

## Extending a primitive

Every class exposes protected lifecycle hooks. Subclass to add observability without touching the base class:

<!-- inline-ts-ok: consumer-facing subclass illustration using the published @studnicky/retry import; demonstrates the extension pattern, not an in-repo runnable example -->
```typescript
import { Retry } from '@studnicky/retry';
import type { RetryContextInterface } from '@studnicky/retry';

class InstrumentedRetry extends Retry {
  protected override onAttempt(ctx: RetryContextInterface): void {
    console.log(`[retry] attempt ${ctx.attemptNumber} of ${this.maxRetries}`);
  }

  protected override onSuccess(ctx: RetryContextInterface): void {
    console.log(`[retry] succeeded after ${ctx.attemptNumber} attempt(s)`);
  }

  protected override onGiveUp(ctx: RetryContextInterface, error: Error): void {
    console.error(`[retry] gave up after ${ctx.attemptNumber} attempts:`, error.message);
  }
}

const retry = new InstrumentedRetry({ maxRetries: 3 });
```

The base `Retry` class never logs; the hooks are no-ops by default. Override only what you need.

## Next steps

- [Architecture](/architecture): the three design principles in depth
- [Packages](/packages/): all 27 packages with API examples
