---
title: '@studnicky/context'
description: Per-request async context isolation using AsyncLocalStorage.
---

# @studnicky/context

> Per-request async context isolation using AsyncLocalStorage.

## Install

```bash
pnpm add @studnicky/context
```

## Usage

```typescript
import { Context } from '@studnicky/context';

// Create a named context store (one per logical domain)
const requestContext = Context.create({ name: 'request' });

// In your request handler
async function handleRequest(req: Request): Promise<Response> {
  const scope = requestContext.initialize({
    requestId: crypto.randomUUID(),
    startedAt: Date.now()
  });

  return scope.execute(async () => {
    // Anywhere in the async call tree:
    const id = requestContext.get<string>('requestId');
    console.log('handling', id);

    return new Response('ok');
  });
}
```

### Builder

```typescript
import { Context } from '@studnicky/context';

const ctx = Context.builder()
  .name('background-job')
  .build();
```

### Terminate to extract final state

```typescript
const scope = requestContext.initialize({ requestId: '123' });

const result = await scope.execute(async () => {
  requestContext.set('statusCode', 200);
  return processRequest();
});

const finalState = scope.terminate();
// { requestId: '123', statusCode: 200 }
```

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/context` | `Context`, `ContextBuilder`, `ContextScope`, `ContextError` |
| `@studnicky/context/errors` | `ContextError` |
| `@studnicky/context/interfaces` | `ContextInterface`, `ContextConfigInterface`, `ContextScopeInterface` |

## Extending

`Context` uses `AsyncLocalStorage` internally. Subclass to add initialization hooks:

```typescript
import { Context } from '@studnicky/context';

class TracedContext extends Context {
  protected override onInitialize(values: Record<string, unknown>): void {
    log.debug({ keys: Object.keys(values) }, 'context initialized');
  }

  protected override onTerminate(state: Record<string, unknown>): void {
    log.debug({ keys: Object.keys(state) }, 'context terminated');
  }
}
```

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/context)
