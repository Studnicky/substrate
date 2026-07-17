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
import type { ModuleErrorOptionsInterface } from '@studnicky/errors';

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

`DomainErrorArgs.build(fields, options)` computes `code`, `message`, and the other `BaseErrorArgumentsType` fields for `super()`, dropping any `cause`/`correlationId`/`metadata`/`retryable` left undefined. Field assignment stays with the caller — `Object.assign(this, fields)` after `super()` — since `this` isn't available before `super()` runs. It works with any error base whose constructor accepts `BaseErrorArgumentsType`-shaped args, not just `BaseError` or `ModuleError` directly, and leaves the `extends` chain untouched so `instanceof` checks against the domain base still hold.

## HookInvoker

`HookInvoker` safely invokes a consumer-supplied lifecycle hook, sync or async, without forcing async contagion on a synchronous caller and without letting a broken hook produce an unhandled rejection or corrupt caller state. Consumer-supplied hooks are unknown implementations — even one typed to return `void` can structurally be an `async` override in TypeScript — so `invoke()` never assumes a hook stays synchronous just because its declared signature says so. It calls `fn` directly without `await`ing at the call site, so a genuinely synchronous hook never touches the Promise machinery; only a thenable result gets chained through a guaranteed `.catch` that routes failure to `onHookError` and can never surface as an unhandled rejection.

A class composes a `HookInvoker` as a field and calls `invoke` from its own methods — it never extends `HookInvoker` directly. Composition, not inheritance, keeps the mechanism available to a class that already extends something else, and matches this codebase's [[no-interceptors-lifecycle-hooks]] convention of protected lifecycle hooks over injected interceptor chains:

```typescript
import { HookInvoker } from '@studnicky/errors';

// Hoisted to module scope, per the delegate-class idiom (e.g. `Paginator`'s
// `PaginatorMachineDelegate`): overrides `onHookError` to record a failure
// instead of letting it throw, so a broken observer hook can never abort or
// revert a mutation that already completed.
class EntityStoreHookInvoker extends HookInvoker {
  constructor(private readonly onError: (hookName: string, cause: unknown) => void) {
    super();
  }

  protected override onHookError<T>(hookName: string, cause: unknown): T {
    this.onError(hookName, cause);
    return undefined as T;
  }
}

class EntityStore<TEntity> {
  readonly #hookErrors: { hookName: string; cause: unknown }[] = [];
  protected readonly hooks: HookInvoker;

  constructor() {
    this.hooks = new EntityStoreHookInvoker((hookName, cause) => {
      this.#hookErrors.push({ hookName, cause });
    });
  }

  get hookErrorCount(): number {
    return this.#hookErrors.length;
  }

  getHookErrors(): readonly { hookName: string; cause: unknown }[] {
    return [...this.#hookErrors];
  }
}
```

The base `onHookError` implementation always throws a `HookInvocationError` carrying the hook's name and the original thrown value as `cause` — this is the disposition a caller gets with no subclass at all, e.g. `Pipeline`'s `hooks: HookInvoker` field, which lets a broken stage hook propagate rather than recording it. That same base disposition also accepts an optional `timeoutMs`, bounding how long an async hook may run before the race is treated as a failure and routed to `onHookError` with a `HookTimeoutError` cause instead — distinct from `HookInvocationError`, since the hook produced no outcome at all:

```typescript
import { HookInvoker } from '@studnicky/errors';

const hooks = new HookInvoker({ timeoutMs: 5_000 });
```

An optional `detectReentrancy: true` makes a synchronous, same-call-stack reentrant call to `invoke` throw `ReentrantHookInvocationError` immediately instead of recursing — a hook override calling back into whatever triggered it is a bug in the override, not something the invoking class can safely absorb.

`HookInvoker` produces three error types: `HookInvocationError` (a hook threw or rejected), `HookTimeoutError` (an async hook neither resolved nor rejected within `timeoutMs`), and `ReentrantHookInvocationError` (a hook re-entered its own call stack synchronously). All three extend `BaseError` and carry the failing `hookName`.

## EventRecorder

`EventRecorder` collapses the "push to an array, then `console.log` a trace line" ceremony that lifecycle-hook overrides duplicate into a single `record()` call. It's reached via the `@studnicky/errors/observers` subpath rather than the package root, and stays intentionally minimal — no config, no pluggable sinks — since it's meant for demo/observability glue, not a general event bus:

```typescript
import { EventRecorder } from '@studnicky/errors/observers';

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

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/errors

## License

MIT
