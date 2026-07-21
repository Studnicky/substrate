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

`@studnicky/errors` is the sole public code entrypoint.

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

`DomainErrorArgs.build()` collapses the repeated "compute `code`/`message`/`retryable`, call `super()`" ceremony that small leaf error classes duplicate. It accepts `DomainErrorOptionsInterface<TFields>` and returns `BaseErrorArgumentsInterface`, so it works with any compatible error base:

<<< ../../packages/errors/examples/04-domain-error-args.ts#usage

## Classifier, module, and validation contracts

`ErrorClassifierFunctionInterface` defines a callable classifier as `(error: Error, attemptNumber: number) => ErrorClassificationEntity.Type`; `ErrorClassifierInterface` is the class/object contract. The schema-derived result remains owned by `ErrorClassificationEntity`.

`ModuleError.create()` accepts `ModuleErrorCreateOptionsInterface`, whose `scenario` selects a key from `ErrorDefaults` and whose remaining fields override scenario defaults. The protected constructor consumes the resolved `ModuleErrorOptionsInterface` contract.

`ValidationErrorArgumentsEntity` owns the `Schema`, derived `Type`, and runtime `validate` guard used by `ValidationError.create()`. Use `ValidationErrorArgumentsEntity.Type` directly for construction arguments.

## EventRecorder

`EventRecorder` collapses the repeated "push to an array, then `console.log` a trace line" ceremony that lifecycle-hook overrides duplicate into a single `record()` call. It is exported from the package root and stays intentionally minimal — no config and no pluggable sinks — because it serves demo and observability glue rather than general event delivery:

<<< ../../packages/errors/examples/05-event-recorder.ts#usage

## HookInvoker

`HookInvoker` safely invokes a consumer-supplied lifecycle hook without letting a broken hook produce an unhandled rejection or corrupt caller state. `invoke(hookName, fn): void` enters the hook synchronously, always returns `undefined`, and internally guards any thenable completion. `invokeAsync(hookName, fn): Promise<void>` uses the same synchronous entry path and is the only API that exposes completion to an awaiting caller. Neither API returns a hook-produced business value. A domain class composes the invoker as a field, preserving that class's inheritance slot:

<<< ../../packages/errors/examples/06-hook-invoker.ts#usage

The protected `onHookError(hookName, cause): void | Promise<void>` method controls failure disposition only. Its base implementation throws `HookInvocationError`; an override may record or swallow by completing normally, or propagate by throwing or rejecting, but cannot return a replacement business value. A synchronous terminal failure reached by `invoke` propagates synchronously. For asynchronous completion, `invoke` observes the terminal failure internally while `invokeAsync` rejects with it. Passing `{ timeoutMs }` to the constructor bounds hook duration; an async hook that neither resolves nor rejects in time routes to `onHookError` with a `HookTimeoutError` cause. Passing `{ detectReentrancy: true }` makes a synchronous, same-call-stack reentrant call to `invoke` throw `ReentrantHookInvocationError` immediately instead of recursing. Await `invokeAsync`; `invoke` deliberately has no observable completion. The constructor consumes `HookInvokerOptionsEntity.Type` directly, and the entity namespace supplies `Schema`, `Type`, and `validate`.

## Public construction and serialization types

`BaseErrorArgumentsInterface` and `DomainErrorOptionsInterface<TFields>` are public construction contracts. Their metadata fields use `JSONSchema7Type`. `BaseError.toSerializedError()` returns `JSONSchema7Object`.

<!-- inline-ts-ok: conceptual public-signature example -->
```typescript
import type { JSONSchema7Object, JSONSchema7Type } from 'json-schema';

import type {
  BaseError,
  BaseErrorArgumentsInterface,
  DomainErrorOptionsInterface
} from '@studnicky/errors';

const metadata: Readonly<Record<string, JSONSchema7Type>> = {
  requestId: 'req-123'
};

const args: BaseErrorArgumentsInterface = {
  code: 'request.failed',
  message: 'Request failed',
  metadata
};

const options: DomainErrorOptionsInterface<{ requestId: string }> = {
  code: 'request.failed',
  message: (fields) => `Request ${fields.requestId} failed`,
  metadata
};

declare const error: BaseError;
const serialized: JSONSchema7Object = error.toSerializedError();
```

Import `JSONSchema7Type` and `JSONSchema7Object` from the module specifier `json-schema` when these types appear in public signatures. Their TypeScript declarations come from the package's direct `@types/json-schema` dependency. `@studnicky/errors` does not proxy these declaration types.

## Error-code registry

Built-in error modules register their dotted error-code descriptors through one package-internal registry during module initialization. The package root exposes the resulting constants and error classes, not registry mutation or collision-handler APIs.

## Public API

The package root exports error classes, classifiers, error-code and HTTP-status constants, entity namespaces, guards, public construction interfaces, `HookInvoker`, and `EventRecorder`.

## Extending

All errors extend `BaseError`, which itself extends the native `Error`. Add domain-specific errors by extending `ModuleError` and overriding `serializeExtra()` and `formatUserMessage()` as shown in the domain subclass example above.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/errors)
