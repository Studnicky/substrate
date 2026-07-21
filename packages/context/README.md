# @studnicky/context

> Per-request async context isolation using AsyncLocalStorage

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/context)

Scoped key-value stores that propagate automatically through async boundaries — promises, timers, and callbacks — without passing values down the call stack.

`@studnicky/context` is the sole public code entrypoint.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/context
```

## Usage

```typescript
import { Context } from '@studnicky/context';

const requestContext = Context.create({ name: 'request' });

// Initialize a scope with optional seed values
const scope = requestContext.initialize({ requestId: 'req-001' });

// Execute within the scope — context is active only inside execute()
const result = await scope.execute(async () => {
  requestContext.set('statusCode', 200);

  // Read anywhere in the async chain
  const id = requestContext.get('requestId');
  const code = requestContext.get('statusCode');

  if (typeof id !== 'string' || typeof code !== 'number') {
    throw new TypeError('Invalid request context');
  }

  return { id, code };
});

// Extract final state and close the scope
const snapshot = scope.terminate();
// { requestId: 'req-001', statusCode: 200 }
```

## Extending

Context is designed for subclassing. Two commonly overridden extension points:

**1. Seed default values with `onInitialize`**

```typescript
import { Context, type ContextScopeInterface } from '@studnicky/context';

class RequestContext extends Context {
  protected override onInitialize(
    initial: Record<string, unknown> | undefined,
    scope: ContextScopeInterface
  ): void {
    // Always present in every scope, regardless of what caller passed
    scope.execute(() => {
      this.set('_startedAt', Date.now());
    });
  }
}

const ctx = RequestContext.create({ name: 'request' });
const scope = ctx.initialize({ requestId: 'req-001' });

scope.execute(() => {
  const startedAt = ctx.get('_startedAt'); // seeded automatically
  if (typeof startedAt !== 'number') throw new TypeError('Missing start time');
});
```

`get(key)` returns `unknown` because string keys carry no runtime type evidence.
Narrow the value before using it. `tryGet(key)` returns `{ found, value }`, so a
stored `undefined` remains distinguishable from a missing key.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/context

## License

MIT
