---
title: '@studnicky/context'
description: Async context isolation for Node and browser code.
---

# @studnicky/context

> Async context isolation for Node and browser code.

## Install

```bash
pnpm add @studnicky/context
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

`@studnicky/context/node` uses AsyncLocalStorage. `@studnicky/context/browser` uses the supplied transform for ordinary `await`; without the transform, use `scope.await(value)` across an await boundary and `scope.bind(callback)` for opaque callbacks. Entities and interfaces retain their canonical public subpaths.

## Node usage

The `/node` entrypoint configures AsyncLocalStorage automatically, so ordinary `await` retains the active scope. Create a named context, initialize a scope with seed values, run code inside `execute()`, then call `terminate()` to extract the final snapshot:

<<< ../../packages/context/examples/basic-context.ts#usage

## One-shot scopes

`Context.run(initial, operation)` creates a scope, runs the operation, terminates the scope, and returns the operation value with its final snapshot.

<!-- inline-ts-ok: Consumer one-shot usage illustrates Context.run automatic cleanup. -->
```typescript
import { Context } from "@studnicky/context/node";

const context = Context.create({ name: "request" });
const result = await context.run({ requestId: "req-001" }, async () => {
  const response = await fetch("/api/profile");
  return response.status;
});

console.log(result.value, result.snapshot.requestId);
```

## Browser usage

Register the supplied Context transform in Vite before running browser code. It preserves Context across ordinary native `await` continuations.

<!-- inline-ts-ok: Consumer Vite configuration uses the published browser transform entrypoint. -->
```typescript
import { defineConfig } from "vite";
import { transform as contextAsyncTransform } from "@studnicky/context/browser/transform";

export default defineConfig({
  plugins: [contextAsyncTransform()]
});
```

Import Context from the browser entrypoint and use ordinary `await` inside an active scope:

<!-- inline-ts-ok: Consumer browser usage illustrates the published runtime entrypoint. -->
```typescript
import { Context } from "@studnicky/context/browser";

const context = Context.create({ name: "request" });
const scope = context.initialize({ requestId: "req-001" });

await scope.execute(async () => {
  const response = await fetch("/api/profile");
  context.set("statusCode", response.status);
});

scope.terminate();
```

### Browser code without the transform

Use `scope.await(value)` when browser code crosses an await boundary without the transform. `Context.run` closes the scope automatically.

<!-- inline-ts-ok: Browser no-transform usage illustrates the public scope.await API. -->
```typescript
const result = await context.run({ requestId: "req-001" }, async (scope) => {
  const response = await scope.await(fetch("/api/profile"));
  return response.status;
});

console.log(result.value, result.snapshot.requestId);
```

### Opaque callback boundaries

Callbacks invoked later need an explicitly managed scope. Remove the callback and terminate the scope when the subscription ends; `Context.run` is for operations that end when their promise settles.

<!-- inline-ts-ok: Browser callback usage illustrates the public scope.bind lifecycle. -->
```typescript
const scope = context.initialize({ requestId: "req-001" });
const onMessage = scope.bind((event: MessageEvent) => {
  context.set("lastMessage", event.data);
});

channel.addEventListener("message", onMessage);

// When the subscription ends:
channel.removeEventListener("message", onMessage);
const snapshot = scope.terminate();
```

## Try it

The playground demo does not run the Vite transform, so it uses `scope.await(value)` to preserve browser Context across its waits. Browser applications use the transform plugin and ordinary `await`.

<RunnableExample src="packages/context/examples/browser-context" title="Context browser scopes — overlapping async isolation" />

## Scope and lookup behavior

`Context.initialize(initial?)` creates a reusable scope, while `Context.run(initial, operation)` creates, executes, terminates, and returns `{ value, snapshot }`. `ContextScopeInterface` provides `execute(fn)`, `await(value)`, `bind(callback)`, and `terminate()`. On Node, ordinary `await` retains Context; browser code uses the transform or the explicit scope methods. `tryGet` returns `undefined` when no scope is active or a key is absent; `get` throws `ContextError` in either case.

## Public API

`@studnicky/context/node` provides AsyncLocalStorage-backed scopes. `@studnicky/context/browser` provides browser context scopes. Both runtime entrypoints export `Context`, `ContextError`, and `ContextConfigError`; schemas use `@studnicky/context/entities`, and contracts use `@studnicky/context/interfaces`.

## Extending

Override `onInitialize` to seed default values into every scope without requiring callers to pass them:

<<< ../../packages/context/examples/subclass-hooks.ts#usage

## Observability hooks

`Context` exposes protected hook methods that a subclass can override. Scope instances remain factory-owned behind `ContextScopeInterface`. All hooks are no-ops by default, and the base class never calls a logger or metrics library.

| Hook | Class | When it fires | Args |
|------|-------|---------------|------|
| `onInitialize` | `Context` | After `initialize()` creates the scope | `initial: Record<string, unknown> \| undefined, scope: ContextScopeInterface` |
| `onMissingContext` | `Context` | When `get`/`set`/etc. is called with no active store; return `true` to suppress throw | `key?: string` → `boolean` |
| `onGet` | `Context` | After a successful `get()` retrieval | `key: string, value: unknown` |
| `onSet` | `Context` | After `set()` stores a value | `key: string, value: unknown` |
| `onDelete` | `Context` | After `delete()` removes (or attempts to remove) a key | `key: string, existed: boolean` |

<<< ../../packages/context/examples/observedContext.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/context)

## Entities

`@studnicky/context/entities` exports every schema namespace in `src/entities`.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
```typescript
import { ContextConfigEntity } from '@studnicky/context/entities';
```

## Interfaces

`@studnicky/context/interfaces` exports every TypeScript interface in `src/interfaces`, including configuration, state, and storage contracts.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
```typescript
import type {
  ContextRunResultInterface,
  ContextScopeInterface,
  ContextStorageInterface
} from "@studnicky/context/interfaces";
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `Context` | Creates AsyncLocalStorage-backed context scopes. | `@studnicky/context/node` |
| `ContextAsyncRuntime` | Internal continuation runtime used by the transform. | `@studnicky/context/node` |
| `ContextConfigError` | Reports invalid Context configuration. | `@studnicky/context/node` |
| `ContextError` | Reports context lifecycle and lookup failures. | `@studnicky/context/node` |
| `Context` | Creates browser context scopes. | `@studnicky/context/browser` |
| `ContextAsyncRuntime` | Internal continuation runtime used by the transform. | `@studnicky/context/browser` |
| `ContextConfigError` | Reports invalid Context configuration. | `@studnicky/context/browser` |
| `ContextError` | Reports context lifecycle and lookup failures. | `@studnicky/context/browser` |
| `transform` | Registers the Vite or Rollup async Context transform. | `@studnicky/context/browser/transform` |
| `ContextStorageInterface` | Defines the shared async storage contract. | `@studnicky/context/interfaces` |
| `ContextRunResultInterface` | Describes the value and final snapshot returned by `Context.run`. | `@studnicky/context/interfaces` |
