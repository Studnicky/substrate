# @studnicky/context

> Async context isolation for Node and browser code

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/context)

Scoped key-value stores propagate through async boundaries without passing values down the call stack. `@studnicky/context/node` uses AsyncLocalStorage; `@studnicky/context/browser` uses the supplied transform for ordinary `await`. Without the transform, browser code uses `scope.await(value)` across an await boundary and `scope.bind(callback)` for opaque callbacks.

Both runtime entrypoints expose the same Context API. Shared contracts remain available from `@studnicky/context/interfaces`, and schemas remain available from `@studnicky/context/entities`.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/context
```

## Node usage

On Node, ordinary `await` preserves the active Context. Use `context.run(initial, operation)` for a one-shot scope that returns `{ value, snapshot }` after automatic cleanup.

```typescript
import { Context } from '@studnicky/context/node';

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

## Browser usage

Import from `@studnicky/context/browser` and register the supplied `transform()` from `@studnicky/context/browser/transform` in Vite. The transform preserves Context across native `await` calls. Without it, use `scope.await(value)`; wrap callbacks passed to opaque browser APIs with `scope.bind(callback)`. Callbacks that outlive the immediate operation use a scope from `context.initialize(...)`; remove the callback and call `scope.terminate()` when the subscription ends.

```typescript
import { Context } from "@studnicky/context/browser";

const requestContext = Context.create({ name: "request" });
const scope = requestContext.initialize({ requestId: "req-001" });

await scope.execute(async () => {
  const response = await fetch("/api/profile");
  requestContext.set("statusCode", response.status);
});

scope.terminate();
```

See the [browser configuration and runnable demo](https://studnicky.github.io/substrate/packages/context) for the Vite plugin setup.

## Extending

Context is designed for subclassing. Two commonly overridden extension points:

**1. Seed default values with `onInitialize`**

```typescript
import { Context } from '@studnicky/context/node';
import type { ContextScopeInterface } from '@studnicky/context/interfaces';

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

Node and browser usage reference: https://studnicky.github.io/substrate/packages/context

## License

MIT
