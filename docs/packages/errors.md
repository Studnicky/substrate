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

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/errors` | `BaseError`, `ModuleError`, `ValidationError`, `CliExitError`, `ErrorCodeRegistry`, `ErrorCode`, `HttpStatus`, `ErrorDefaults` |
| `@studnicky/errors/constants` | `ErrorCode`, `HttpStatus`, `ErrorDefaults`, `CAUSE_CHAIN_DEPTH_LIMIT` |
| `@studnicky/errors/errors` | Error classes |
| `@studnicky/errors/interfaces` | Interface types |
| `@studnicky/errors/types` | `ErrorScenarioType` |

## Extending

All errors extend `BaseError`, which itself extends the native `Error`. Add domain-specific errors by extending `ModuleError` and overriding `serializeExtra()` and `formatUserMessage()` as shown in the domain subclass example above.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/errors)
