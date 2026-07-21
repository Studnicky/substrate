# @studnicky/errors

> Standardized error handling for all modules

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/errors)

`@studnicky/errors` provides a typed error hierarchy rooted at `BaseError`. Every error carries a machine-readable `code`, a `timestamp`, structured `metadata`, and a serializable cause chain. `ModuleError` adds scenario-based defaults, HTTP status codes, and context dictionaries. Subclassing is the primary extension point.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/errors
```

## Usage

```typescript
import { ModuleError, ErrorDefaults } from '@studnicky/errors';

// Quick error with scenario defaults
const err = ModuleError.create('User not found', {
  scenario: 'NOT_FOUND',
  context: { userId: 'u-123' }
});

console.log(err.code);       // 'NOT_FOUND'
console.log(err.statusCode); // 404
console.log(err.retryable);  // false

// Serialized for structured logging
const json = err.toJSON();
// { code, message, name, retryable, stack, context, ... }
```

## Extending

Subclass `ModuleError` to define domain-specific error classes with fixed defaults:

```typescript
import { ModuleError } from '@studnicky/errors';

export class DatabaseError extends ModuleError {
  static override create(
    message: string,
    options?: { cause?: Error; context?: Record<string, unknown> }
  ): DatabaseError {
    return new DatabaseError(message, {
      code: 'DATABASE_ERROR',
      cause: options?.cause,
      context: options?.context,
      retryable: false,
      statusCode: 500
    });
  }

  protected override serializeExtra(): Record<string, unknown> {
    return { domain: 'database' };
  }
}

const err = DatabaseError.create('Query timeout', { context: { query: 'SELECT...' } });
console.log(err.name);    // 'DatabaseError'
console.log(err.code);    // 'DATABASE_ERROR'
```

Override `formatUserMessage()` to provide user-safe messages distinct from internal error messages.

## DomainErrorArgs

Leaf error classes that just carry typed fields onto a domain error base can skip the manual `this.x = x` assignment ceremony with `DomainErrorArgs.build()`:

```typescript
import { DomainErrorArgs } from '@studnicky/errors';

class RateLimitExceededError extends RateLimitError {
  readonly route!: string;
  readonly limit!: number;

  constructor(route: string, limit: number) {
    const fields = { route, limit };
    super(DomainErrorArgs.build(fields, {
      code: 'rateLimit.exceeded',
      message: (f) => `Rate limit of ${f.limit} exceeded for "${f.route}"`,
      retryable: true
    }));
    Object.assign(this, fields);
  }
}
```

`DomainErrorArgs.build(fields, options)` accepts `DomainErrorOptionsInterface<TFields>` and returns `BaseErrorArgumentsInterface`, dropping any `cause`/`correlationId`/`metadata`/`retryable` left undefined. Field assignment stays with the caller — `Object.assign(this, fields)` after `super()` — since `this` is unavailable before `super()` runs. It works with any error base whose constructor accepts `BaseErrorArgumentsInterface` and leaves the `extends` chain untouched so `instanceof` checks against the domain base still hold.

## Classifier, module, and validation contracts

`ErrorClassifierFunctionInterface` is the callable classifier contract: `(error: Error, attemptNumber: number) => ErrorClassificationEntity.Type`. Class-based classifiers implement `ErrorClassifierInterface`. Both contracts return the schema-derived classification owned by `ErrorClassificationEntity`.

`ModuleError.create(message, options)` accepts `ModuleErrorCreateOptionsInterface`. Its required `scenario` selects a key from `ErrorDefaults`; `cause`, `context`, `retryable`, and `statusCode` are optional overrides. The protected `ModuleError` constructor accepts `ModuleErrorOptionsInterface`, the resolved contract with a required `code` and explicit context, retry, and status fields.

`ValidationErrorArgumentsEntity` owns the `Schema`, derived `Type`, and runtime `validate` guard for `ValidationError.create()`. Consumers refer to `ValidationErrorArgumentsEntity.Type` directly when they need the construction-argument type.

`ErrorDiagnosticEntity` owns the serializable `message`, `name`, and optional `stack` fields shared by error contracts. Example event payloads follow the same rule: the event-recorder example defines `CacheEventEntity` and records `CacheEventEntity.Type` values.

## Public construction and serialization types

Construction contracts are interfaces exported from the package root. JSON value types remain owned by their declaration module:

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

Import `JSONSchema7Type` and `JSONSchema7Object` from the module specifier `json-schema` when a public signature uses them. Their TypeScript declarations come from the package's direct `@types/json-schema` dependency. `@studnicky/errors` does not proxy these types.

## HookInvoker

`HookInvoker` safely invokes a consumer-supplied lifecycle hook, sync or async, without letting a broken hook produce an unhandled rejection or corrupt caller state. `invoke(hookName, fn): void` enters `fn` synchronously and always returns `undefined`; when `fn` returns a thenable, the invoker guards its completion internally. `invokeAsync(hookName, fn): Promise<void>` enters the same path and is the only API that exposes completion to callers that need to wait. Neither method returns a hook-produced business value.

A class composes a `HookInvoker` as a field and calls `invoke` from its own methods. Composition keeps the mechanism available to a class that already extends something else. The constructor consumes `HookInvokerOptionsEntity.Type` directly; `HookInvokerOptionsEntity` exports its schema, derived type, and runtime validator:

```typescript
import { HookInvoker } from '@studnicky/errors';

class ObservedStore {
  static readonly #OwnedHookInvoker = class StoreHookInvoker extends HookInvoker {
    protected override onHookError(_hookName: string, _cause: unknown): void {}
  };

  readonly #hooks = new ObservedStore.#OwnedHookInvoker();

  get hookErrorCount(): number { return this.#hooks.hookErrorCount; }
  getHookErrors() { return this.#hooks.getHookErrors(); }

  store(): void {
    this.#hooks.invoke('onStored', () => { console.log('stored'); });
  }

  async index(): Promise<void> {
    await this.#hooks.invokeAsync('onIndexed', async () => { await Promise.resolve(); });
  }
}
```

`HookInvoker` snapshots and records each complete hook-error graph once before applying its disposition, so later mutation of the originally thrown error, its cause, arrays, or plain objects cannot alter stored diagnostics. `hookErrorCount` reports the invoker-owned diagnostic count and `getHookErrors()` returns another fresh `HookInvocationError`, nested `Error`, and cause projection on every read. An owning class delegates its diagnostic surface to those two members and never retains a second error array. The protected `onHookError(hookName, cause): void | Promise<void>` method controls failure disposition only. Its base implementation throws a `HookInvocationError` carrying the hook name and original thrown value as `cause`. An override may swallow the failure by completing normally, or propagate a failure by throwing or rejecting; it cannot fabricate a replacement value for the hook or invoking business operation. A synchronous terminal failure reached by `invoke` propagates synchronously. For asynchronous completion, `invoke` observes the terminal failure internally while `invokeAsync` rejects with it. The same disposition applies to an optional `timeoutMs`, which bounds async hook completion and routes a timeout to `onHookError` with a `HookTimeoutError` cause:

```typescript
import type { HookInvokerOptionsEntity } from '@studnicky/errors';

import { HookInvoker } from '@studnicky/errors';

const hookOptions: HookInvokerOptionsEntity.Type = { timeoutMs: 5_000 };
const hooks = new HookInvoker(hookOptions);
```

An optional `detectReentrancy: true` makes a synchronous, same-call-stack reentrant call to `invoke` throw `ReentrantHookInvocationError` immediately instead of recursing — a hook override calling back into whatever triggered it is a bug in the override, not something the invoking class can safely absorb. Await `invokeAsync`; `invoke` deliberately has no observable completion.

`HookInvoker` produces three error types: `HookInvocationError` (a hook threw or rejected), `HookTimeoutError` (an async hook neither resolved nor rejected within `timeoutMs`), and `ReentrantHookInvocationError` (a hook re-entered its own call stack synchronously). All three extend `BaseError` and carry the failing `hookName`.

## EventRecorder

`EventRecorder` collapses the "record an event, then `console.log` a trace line" ceremony that lifecycle-hook overrides duplicate into a single `record()` call. It snapshots recorded data and returns detached event projections so observers cannot mutate recorder state. It stays intentionally minimal — no config, no pluggable sinks — since it's meant for demo/observability glue, not a general event bus:

```typescript
import { EventRecorder } from '@studnicky/errors';

class TracingCache {
  #recorder = new EventRecorder<{ event: string; key: string }>();

  get events() {
    return this.#recorder.events;
  }

  protected onAccess(key: string, hit: boolean): void {
    const event = { event: hit ? 'hit' : 'miss', key };
    this.#recorder.record(event, `[cache] ${event.event} key=${key}`);
  }
}
```

## Public entrypoint

`@studnicky/errors` is the sole public code entrypoint. It exports error classes, classifiers, entity namespaces, guards, constants, public interfaces, and `EventRecorder`.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/errors

## License

MIT
