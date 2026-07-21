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

`@studnicky/context` is the sole public code entrypoint.

::: info Live demo unavailable
In-browser execution of this package is not supported. Async context propagation across `await` boundaries relies on Node's `AsyncLocalStorage` from `node:async_hooks`, which browsers do not provide. The examples below are shown statically.
:::

## Usage

Create a named context, initialize a scope with seed values, run code inside `execute()`, then call `terminate()` to extract the final snapshot:

<<< ../../packages/context/examples/basic-context.ts#usage

## Scope and lookup behavior

`Context.initialize(initial?)` is the sole context-scope construction path. It returns `ContextScopeInterface`, whose public operations are `execute(fn)` and `terminate()`. `tryGet` returns `undefined` when no scope is active or a key is absent; `get` throws `ContextError` in either case.

## Public API

The package root exports `Context`, `ContextConfigEntity`, `ContextInterface`, `ContextScopeInterface`, `ContextError`, and `ContextConfigError`.

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
