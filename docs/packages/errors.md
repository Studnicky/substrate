---
title: '@studnicky/errors'
description: Standardized error hierarchy with cause-chain serialization and error codes.
---

# @studnicky/errors

> Standardized error handling for all modules.

## Install

```bash
pnpm add @studnicky/errors
```

## BaseError subclass

Extend `BaseError` to add domain codes, `toJSON()` serialization, user-facing messages, and cause-chain traversal:

<<< ../../packages/errors/examples/01-base-error.ts#usage

## Try it

<RunnableExample src="packages/errors/examples/01-base-error" title="BaseError subclass with code, toJSON, and cause chain" />

The output shows the error code, timestamp, retryable flag, user message, serialized domain field from `serializeExtra()`, and a two-node cause chain traversal.

## ModuleError with scenario defaults

`ModuleError.create()` resolves HTTP status codes, retry flags, and error codes from a named scenario:

<<< ../../packages/errors/examples/02-module-error.ts#usage

## Domain subclass extending ModuleError

Add domain-specific `create()`, `serializeExtra()`, and `formatUserMessage()` by subclassing `ModuleError`:

<<< ../../packages/errors/examples/03-domain-subclass.ts#usage

## Domain errors with `DomainErrorArgs`

`DomainErrorArgs.build()` collapses the repeated "compute `code`/`message`/`retryable`, call `super()`" ceremony that small leaf error classes duplicate. It works with any error base whose constructor takes `BaseErrorArgumentsType`-shaped args, not only `BaseError` or `ModuleError` directly:

<<< ../../packages/errors/examples/04-domain-error-args.ts#usage

## EventRecorder

`EventRecorder` collapses the repeated "push to an array, then `console.log` a trace line" ceremony that lifecycle-hook overrides duplicate into a single `record()` call. It's reached via the `@studnicky/errors/observers` subpath rather than the package root, and stays intentionally minimal — no config, no pluggable sinks — since it's meant for demo and observability glue, not a general event bus:

<<< ../../packages/errors/examples/05-event-recorder.ts#usage

## HookInvoker

`HookInvoker` safely invokes a consumer-supplied lifecycle hook — synchronous or asynchronous — without forcing async contagion on a synchronous caller and without letting a broken hook produce an unhandled rejection or corrupt caller state. A class composes it as a field (never extends it directly, so it never spends the class's one `extends` slot), and calls `invoke(hookName, fn)` from its own methods:

<<< ../../packages/errors/examples/06-hook-invoker.ts#usage

The base `onHookError` always throws a `HookInvocationError`. A caller that needs a different disposition — record-and-continue, as above, or swallow-and-default — defines a small subclass, hoisted to module scope, overriding `onHookError`. A caller that wants the base throwing behavior with a bound on hook duration passes `{ timeoutMs }` to the constructor directly, with no subclass needed; an async hook that neither resolves nor rejects in time routes to `onHookError` with a `HookTimeoutError` cause instead of `HookInvocationError`. Passing `{ detectReentrancy: true }` makes a synchronous, same-call-stack reentrant call to `invoke` throw `ReentrantHookInvocationError` immediately instead of recursing.

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/errors` | `BaseError`, `ModuleError`, `DomainErrorArgs`, `ValidationError`, `CliExitError`, `ErrorCodeRegistry`, `ErrorCode`, `HttpStatus`, `ErrorDefaults`, `DomainErrorOptionsType`, `HookInvoker`, `HookInvocationError`, `HookTimeoutError`, `ReentrantHookInvocationError`, `HookInvokerOptionsType` |
| `@studnicky/errors/constants` | `ErrorCode`, `HttpStatus`, `ErrorDefaults`, `CAUSE_CHAIN_DEPTH_LIMIT` |
| `@studnicky/errors/errors` | Error classes |
| `@studnicky/errors/interfaces` | Interface types |
| `@studnicky/errors/observers` | `EventRecorder` |
| `@studnicky/errors/types` | `ErrorScenarioType` |

## Extending

All errors extend `BaseError`, which itself extends the native `Error`. Add domain-specific errors by extending `ModuleError` and overriding `serializeExtra()` and `formatUserMessage()` as shown in the domain subclass example above.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/errors)
