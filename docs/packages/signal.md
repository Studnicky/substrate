---
title: '@studnicky/signal'
description: AbortSignal composition helpers — deadline, caller signal, and never-aborting sentinel.
---

# @studnicky/signal

> Compose AbortSignals from callers and deadlines without repetitive AbortController boilerplate.

## Install

```bash
pnpm add @studnicky/signal
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

### Compose a signal from a caller signal and/or a deadline

```typescript
import { Signal } from '@studnicky/signal';

// Caller provides a signal; add a deadline
async function fetchData(url: string, signal?: AbortSignal): Promise<Response> {
  const composed = Signal.compose({ signal, deadlineMs: 5_000 });
  return fetch(url, { signal: composed });
}
```

`Signal.compose` combines a caller `AbortSignal` and a timeout deadline using `AbortSignal.any`. The composed signal aborts as soon as either source fires. If neither is provided, it returns the never-aborting sentinel so consuming code always receives a valid `AbortSignal`.

### Timeout-only signal

```typescript
const signal = Signal.timeout(3_000); // AbortSignal.timeout(3000)
await fetch(url, { signal });
```

### Never-aborting sentinel

```typescript
const signal = Signal.never();
// Useful as a default parameter when a caller provides no signal
await longRunningTask(signal);
```

The sentinel is a singleton — `Signal.never()` returns the same `AbortSignal` instance on every call.

### Practical pattern — propagate cancellation with a budget

```typescript
import { Signal } from '@studnicky/signal';

async function processWithBudget(
  items: string[],
  signal?: AbortSignal
): Promise<void> {
  const budget = Signal.compose({ signal, deadlineMs: 10_000 });

  for (const item of items) {
    if (budget.aborted) break;
    await processItem(item, budget);
  }
}
```

## API

| Export | Type | Description |
|--------|------|-------------|
| `Signal` | class | Static-only AbortSignal composition helpers |

### `Signal`

| Member | Signature | Description |
|--------|-----------|-------------|
| `compose` | `static (options: { signal?, deadlineMs? }) => AbortSignal` | Merges caller signal and/or timeout; returns never-signal when neither is provided |
| `timeout` | `static (ms: number) => AbortSignal` | Returns `AbortSignal.timeout(ms)` |
| `never` | `static () => AbortSignal` | Returns a singleton signal that never aborts |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/signal)
