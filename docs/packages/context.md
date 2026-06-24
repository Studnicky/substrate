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

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/context)
