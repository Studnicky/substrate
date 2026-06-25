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

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

Create a named context, initialize a scope with seed values, run code inside `execute()`, then call `terminate()` to extract the final snapshot:

<<< ../../packages/context/examples/basic-context.ts#usage

## Builder API and tryGet vs get

Use `Context.builder()` for the fluent construction style. `tryGet` returns `undefined` for absent keys; `get` throws `ContextError`:

<<< ../../packages/context/examples/builder-api.ts#usage

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/context` | `Context`, `ContextBuilder`, `ContextScope`, `ContextScopeBuilder`, `ContextScopeOptionsInterface`, `ContextError`, `ContextConfigError` |
| `@studnicky/context/errors` | `ContextError`, `ContextConfigError` |
| `@studnicky/context/interfaces` | `ContextInterface`, `ContextScopeInterface` |

## Extending

Override `onInitialize` to seed default values into every scope without requiring callers to pass them:

<<< ../../packages/context/examples/subclass-hooks.ts#usage

## Observability hooks

Both `Context` and `ContextScope` expose protected hook methods you can override in a subclass. All hooks are no-ops by default. The base class never calls any logger or metrics library.

| Hook | Class | When it fires | Args |
|------|-------|---------------|------|
| `onInitialize` | `Context` | After `initialize()` creates the scope | `initial: Record<string, unknown> \| undefined, scope: ContextScope` |
| `onMissingContext` | `Context` | When `get`/`set`/etc. is called with no active store; return `true` to suppress throw | `key?: string` → `boolean` |
| `onGet` | `Context` | After a successful `get()` retrieval | `key: string, value: unknown` |
| `onSet` | `Context` | After `set()` stores a value | `key: string, value: unknown` |
| `onDelete` | `Context` | After `delete()` removes (or attempts to remove) a key | `key: string, existed: boolean` |
| `onExit` | `ContextScope` | Before FSM leaves a state (before `#state` updates) | `from: ContextScopeState, to: ContextScopeState` |
| `onEnter` | `ContextScope` | After FSM enters a new state | `to: ContextScopeState, from: ContextScopeState` |
| `onBeforeExecute` | `ContextScope` | Before each `execute()` invocation (success path only) | — |
| `onAfterExecute` | `ContextScope` | After each `execute()` completes without error | — |
| `onError` | `ContextScope` | When the fn passed to `execute()` throws; error re-throws after | `error: unknown` |
| `onTerminatedAccess` | `ContextScope` | When `execute()` is called on a terminated scope; throw always follows | — |
| `onDispose` | `ContextScope` | After internal store is cleared in `terminate()` | — |
| `onTerminate` | `ContextScope` | During `terminate()`, after dispose; can augment the snapshot | `snapshot: Record<string, unknown>` → `Record<string, unknown>` |

<<< ../../packages/context/examples/observedContext.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/context)
