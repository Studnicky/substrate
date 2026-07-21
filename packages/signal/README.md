# @studnicky/signal

> Compose AbortSignals from callers and deadlines without repetitive AbortController boilerplate.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/signal)

`@studnicky/signal` provides a single composable entry point for AbortSignal construction. Pass a caller-provided signal, a deadline in milliseconds, both, or neither — `compose` returns the correct signal for each case without requiring manual `AbortController` wiring.

`Signal` is an instantiable primitive — `Signal.create()` returns an explicitly owned instance with the canonical `compose(options)` method and a protected hook that a subclass can override to observe composition.

The library also exposes `Signal.never()`, a singleton sentinel that never aborts, useful as a default when downstream APIs require an `AbortSignal` argument but the caller has no cancellation intent.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/signal
```

## Usage

```typescript
import { Signal, SignalError } from '@studnicky/signal';

const signals = Signal.create();

// Combine a caller signal with a 5-second deadline — whichever fires first wins
async function fetchWithDeadline(callerSignal: AbortSignal): Promise<Response> {
  const signal = await signals.compose({ signal: callerSignal, deadlineMs: 5000 });
  return fetch('https://api.example.com/data', { signal });
}

// Timeout only — no caller signal available
async function fetchWithTimeout(): Promise<Response> {
  const signal = await signals.compose({ deadlineMs: 10_000 });
  return fetch('https://api.example.com/data', { signal });
}

// Never-aborting sentinel — useful as a safe default
function getDefaultSignal(): AbortSignal {
  return Signal.never(); // same singleton on every call
}

// Invalid deadlineMs throws SignalError
try {
  await signals.compose({ deadlineMs: -1 });
} catch (err) {
  if (err instanceof SignalError) {
    console.error('Invalid config:', err.message);
  }
}
```

### The `onCompose` hook

Subclass `Signal` and override `onCompose` to observe every composed signal — the base class never logs on its own:

```typescript
import { Signal } from '@studnicky/signal';

class ObservedSignal extends Signal {
  protected override onCompose(
    options: { deadlineMs?: number; signal?: AbortSignal },
    result: AbortSignal,
  ): void {
    console.log('composed', options, '->', result);
  }
}

const signals = new ObservedSignal();
await signals.compose({ deadlineMs: 5000 }); // logs the composed signal
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/signal

## License

MIT
