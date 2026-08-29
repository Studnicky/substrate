---
title: '@studnicky/errors'
description: Standardized error hierarchy serializing to RFC 9457 Problem Details.
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

## Try it

<RunnableExample src="packages/errors/examples/02-module-error" title="Creating structured ModuleError instances from named scenarios" />

The output shows `ModuleError.create()` resolving `code`/`status`/`retryable` from the `NOT_FOUND` and `CONNECTION` scenario defaults, `BaseError.getCauseChain()` walking a wrapped `TIMEOUT` error's cause chain, and `toJSON()` serializing the error's `title` and `code`.

## RFC 9457 Problem Details

Every error serializes to one form: an [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) Problem Details object. `toJSON()` returns it, so `JSON.stringify(error)` produces it too. There is no second serialized shape.

### Member mapping

| Member | Source | Why |
|---|---|---|
| `type` | `problemType()` — the problem namespace joined with `code` | §3.1.1: the URI reference identifying the problem type. This is the discriminant. |
| `title` | the error's class name | §3.1.2: a short summary that must NOT change between occurrences. |
| `detail` | `message` | §3.1.4: explicitly specific to THIS occurrence. |
| `status` | `status`, when the error carries one | §3.1.3. |
| `instance` | `instance`, when the error carries one | §3.1.5. |

Everything else is an extension member (§3.2): `code`, `correlationId`, `timestamp`, `retryable`, `context`, `stack`, and the flattened `causes` chain.

```json
{
  "type": "https://problems.studnicky.dev/fetch.httpError",
  "title": "HTTPError",
  "detail": "HTTP 503 Service Unavailable: https://api.example.com/orders",
  "status": 503,
  "instance": "https://api.example.com/orders",
  "code": "fetch.httpError",
  "retryable": true,
  "timestamp": 1756461600000
}
```

### Two rules that are easy to get wrong

**Every member is optional.** §3.1 defines no required member, and an absent `type` means `about:blank` (§4.2.1). `ProblemDetailsEntity` therefore requires nothing — including `type`, whose schema default is deliberately omitted, because a member with a default is no longer optional.

**Extension members must survive.** §3.2 lets a problem type extend the object, and consumers must ignore members they do not recognise. The schema is open, and `ProblemDetailsEntity.intake` copies its candidate through rather than rebuilding it from the declared members — rebuilding would silently drop exactly the data an extension carries.

### Cause chains

The chain is flattened into the `causes` extension, nearest first, bounded at 32 hops and cycle-safe. Each node carries `type`/`title`/`detail`, plus `code`/`context`/`correlationId`/`timestamp` when that node was itself a `BaseError`. Only the head carries `stack`; a cause node is a summary.

A caught value that is not an `Error` still projects: a thrown string resolves to `.../thrown-string`, a thrown primitive to `.../thrown-primitive`, `null` to `.../thrown-nullish`. The problem type URI carries that classification, so no separate discriminant member exists.

### Subclass extensions

Override `serializeExtra()` to add extension members. Registered members always win — extras are merged first — so an extension named `context` or `status` cannot silently displace the contract. Override `problemType()` to point a specific problem type at published documentation.

## Entities

`@studnicky/errors/entities` exports every schema namespace in `src/entities`, including error classifications, validation arguments and reports, error diagnostics, and native-error field projections. Each namespace exposes its `Schema`, inferred `Type`, and runtime `validate` predicate.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
```typescript
import type { ErrorClassificationEntity } from '@studnicky/errors/entities';
```

## Interfaces

`@studnicky/errors/interfaces` exports every TypeScript interface in `src/interfaces`, including `ModuleErrorInterface` plus construction and classifier contracts.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
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
| `RuntimeError` | Represents a generic package-owned runtime failure. | `@studnicky/errors` |
| `ValidationError` | Represents a single validation failure. | `@studnicky/errors` |
| `ValidationErrors` | Collects and reports validation failures. | `@studnicky/errors` |
| `DefaultHttpErrorClassifier` | Classifies standard HTTP failures for retry behavior. | `@studnicky/errors` |
| `ErrorClassifier` | Base class for custom error classifiers. | `@studnicky/errors` |
| `matchers` | Provides runtime error-classification predicates. | `@studnicky/errors` |
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
