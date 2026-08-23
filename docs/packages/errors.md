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

## Usage

`ModuleError.create()` resolves error code, retry behavior, and HTTP status from a named scenario.

<<< ../../packages/errors/examples/02-module-error.ts#usage

Extend `BaseError` or `ModuleError` for a domain-specific error, and use `DomainErrorArgumentList` when a leaf error carries typed fields.

<<< ../../packages/errors/examples/01-base-error.ts#usage

<<< ../../packages/errors/examples/04-domain-error-args.ts#usage

`HookInvoker` runs synchronous or asynchronous lifecycle hooks, preserving diagnostics in `HookInvocationError` and reporting timeouts as `HookTimeoutError`.

<<< ../../packages/errors/examples/06-hook-invoker.ts#usage

`EventRecorder` stores detached event projections for small observability integrations.

<<< ../../packages/errors/examples/05-event-recorder.ts#usage

## Entities

`@studnicky/errors/entities` exports every schema namespace in `src/entities`, including error classifications, validation arguments and reports, error diagnostics, and native-error field projections. Each namespace exposes its `Schema`, inferred `Type`, and runtime `validate` predicate.

```typescript
import type { ErrorClassificationEntity } from '@studnicky/errors/entities';
```

## Interfaces

`@studnicky/errors/interfaces` exports every TypeScript interface in `src/interfaces`, including `ModuleErrorInterface` plus construction and classifier contracts.

```typescript
import type { ModuleErrorInterface } from '@studnicky/errors/interfaces';
```

`BaseErrorArgumentsInterface`, `DomainErrorOptionsInterface`, `ErrorClassifierFunctionInterface`, `ErrorClassifierInterface`, `ModuleErrorCreateOptionsInterface`, and `ModuleErrorOptionsInterface` also remain at the root because callers pass or implement them when using the public API.

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `BaseError` | Base class for structured application errors. | `@studnicky/errors` |
| `CliExitError` | Represents a command-line exit failure. | `@studnicky/errors` |
| `DomainErrorArgumentList` | Builds typed constructor arguments for domain errors. | `@studnicky/errors` |
| `HookInvocationError` | Represents a lifecycle-hook failure. | `@studnicky/errors` |
| `HookInvoker` | Invokes lifecycle hooks with diagnostic handling. | `@studnicky/errors` |
| `HookTimeoutError` | Represents a timed-out asynchronous hook. | `@studnicky/errors` |
| `ModuleError` | Creates structured errors from named scenario defaults. | `@studnicky/errors` |
| `ReentrantHookInvocationError` | Represents synchronous hook reentrancy. | `@studnicky/errors` |
| `ValidationError` | Represents a single validation failure. | `@studnicky/errors` |
| `ValidationErrors` | Collects and reports validation failures. | `@studnicky/errors` |
| `DefaultHttpErrorClassifier` | Classifies standard HTTP failures for retry behavior. | `@studnicky/errors` |
| `ErrorClassifier` | Base class for custom error classifiers. | `@studnicky/errors` |
| `matchers` | Provides runtime error-classification predicates. | `@studnicky/errors` |
| `ErrorClassificationGuard` | Validates error-classification values at runtime. | `@studnicky/errors` |
| `errorTypeGuards` | Provides runtime type predicates for error shapes. | `@studnicky/errors` |
| `EventRecorder` | Records detached event projections for observers. | `@studnicky/errors` |
| `ErrorCode` | Provides standard error-code values. | `@studnicky/errors` |
| `ErrorDefaults` | Provides named default error scenarios. | `@studnicky/errors` |
| `HttpStatus` | Provides common HTTP status-code values. | `@studnicky/errors` |
| `HTTP_INFORMATIONAL_START` | Marks the lower bound of informational HTTP responses. | `@studnicky/errors` |
| `HTTP_INFORMATIONAL_END` | Marks the upper bound of informational HTTP responses. | `@studnicky/errors` |
| `HTTP_SUCCESS_START` | Marks the lower bound of successful HTTP responses. | `@studnicky/errors` |
| `HTTP_SUCCESS_END` | Marks the upper bound of successful HTTP responses. | `@studnicky/errors` |
| `HTTP_REDIRECT_START` | Marks the lower bound of redirect HTTP responses. | `@studnicky/errors` |
| `HTTP_REDIRECT_END` | Marks the upper bound of redirect HTTP responses. | `@studnicky/errors` |
| `HTTP_CLIENT_ERROR_START` | Marks the lower bound of client-error HTTP responses. | `@studnicky/errors` |
| `HTTP_CLIENT_ERROR_END` | Marks the upper bound of client-error HTTP responses. | `@studnicky/errors` |
| `HTTP_REQUEST_TIMEOUT` | Provides the HTTP request-timeout status code. | `@studnicky/errors` |
| `HTTP_SERVER_ERROR_START` | Marks the lower bound of server-error HTTP responses. | `@studnicky/errors` |
| `HTTP_SERVER_ERROR_END` | Marks the upper bound of server-error HTTP responses. | `@studnicky/errors` |
| `BaseErrorArgumentsInterface` | Defines arguments passed to `BaseError` subclasses. | `@studnicky/errors` |
| `DomainErrorOptionsInterface` | Defines options passed to `DomainErrorArgumentList.build()`. | `@studnicky/errors` |
| `ErrorClassifierFunctionInterface` | Defines a callable custom error classifier. | `@studnicky/errors` |
| `ErrorClassifierInterface` | Defines a class-based custom error classifier. | `@studnicky/errors` |
| `ModuleErrorCreateOptionsInterface` | Defines options passed to `ModuleError.create()`. | `@studnicky/errors` |
| `ModuleErrorOptionsInterface` | Defines options passed to `ModuleError` subclasses. | `@studnicky/errors` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/errors)
