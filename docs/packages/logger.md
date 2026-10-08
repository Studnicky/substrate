---
title: "@studnicky/logger"
description: Pluggable logging with transport architecture, child loggers, and immutable structured entries.
---

# @studnicky/logger

> Pluggable logging interface with portable transport architecture, child loggers, and metadata support.

## What it is

A composable structured-logging primitive with immutable records, pluggable transports, child bindings, and protected observation hooks. It supplies log mechanics and contracts without selecting an observability vendor or application telemetry policy.

## What it is for

Northstar Books uses it to attach consistent component, operation, and order context to catalogue and fulfilment events before sending them to application-selected transports. Consumers choose retention, destinations, levels, and privacy policy.

## Northstar Books examples

The runnable lifecycle-hooks example emits and filters structured records while observing fan-out and transport errors. It maps to Northstar Books auditing a fulfilment operation, proving that instrumentation can see logging behavior without altering the logger's public API or coupling it to a specific collector.

## Public entrypoints

| Import path                    | Use it when                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `@studnicky/logger/node`       | A Northstar Books server creates structured logs and selects server-side transports.     |
| `@studnicky/logger/browser`    | A storefront browser writes portable structured records through browser-safe transports. |
| `@studnicky/logger/entities`   | An adapter validates serializable log records, bodies, faults, levels, and statuses.     |
| `@studnicky/logger/interfaces` | TypeScript code shares logger, metadata, transport, and request contracts.               |

## Install

```bash
pnpm add @studnicky/logger
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

A logger is only as useful as the questions it can answer later, so Northstar wants every entry to carry the same shape: a component, an operation, a status, a message. This example builds a `Logger` with an in-memory transport, writes one successful `LogBody` entry and one `LogFault` entry, clears the buffer, then creates a child logger and confirms its own metadata (`service: 'auth'`) rides along on every record it writes — all without the component code ever knowing where the logs actually end up:

<<< ../../packages/logger/examples/01-memory-transport.ts#usage

## Browser console transport

`Logger` and `ConsoleTransport` use the `/browser` entrypoint in browser applications and the `/node` entrypoint in Node.js applications. The console transport dispatches records to the native browser console without importing a server runtime.

## Immutable LogBody and LogFault configuration

`LogBody.create(config)` and `LogFault.create(config)` validate one readonly configuration
object and return an immutable normalized entry. Both require `component`, `operation`,
`status`, `message`, and `context`; faults also require `name`. Missing required fields throw
`LogBuildError`. The usage example above exercises both factories from the selected runtime entrypoint.

## Fan-out and level filtering

One request might need a full debug log and only its warnings and errors sent to an alerting channel — `Logger` doesn't force a choice between the two. This example attaches two transports with different level floors to one logger, sends an `info` that only the permissive transport keeps, then a `warn` that both keep, and finally logs through a child logger to confirm its metadata still reaches every transport the parent has, not just the one it was created from:

<<< ../../packages/logger/examples/03-fanout.ts#usage

## Custom transports

Not every destination wants one record at a time — a transport shipping logs over the network usually wants to batch them first. This example writes a small `BufferedTransport` that implements `TransportInterface` directly, uses `ParseLogLevel.parse()` to accept its minimum level as a plain string, and only calls its sink once two records have accumulated. The assertions confirm the first log alone doesn't trigger a flush, but the second one does:

<<< ../../packages/logger/examples/04-custom-transport.ts#usage

## Observability hooks

The point of a hook is that nothing needs to touch `Logger` itself to see what it's doing — subclass it, override one of the four protected methods below, and there's a front-row seat to every record assembled, every record dropped, every child created, and every transport that throws.

| Hook               | Class    | When it fires                                                    | Args                                                                          |
| ------------------ | -------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `onLog`            | `Logger` | After a record is assembled, before fan-out to transports        | `level: LogLevelEntity.Type, record: LogRecordEntity.Type`                    |
| `onDropped`        | `Logger` | When a record is below the logger's level floor and is discarded | `level: LogLevelEntity.Type`                                                  |
| `onChildCreate`    | `Logger` | After a child logger is created via `.child()`                   | `bindings: LogMetadataInterface`                                              |
| `onTransportError` | `Logger` | When a transport's `write()` throws                              | `transport: TransportInterface, record: LogRecordEntity.Type, error: unknown` |

<<< ../../packages/logger/examples/observedLogger.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

`Logger` composes a plain `HookInvoker` with no override, so a throwing `onLog`, `onDropped`, or `onChildCreate` propagates the default `HookInvocationError` to the caller rather than being recorded. `onTransportError` is the one hook `Logger` itself guards: a throwing override is caught and recorded instead of aborting fan-out to the remaining transports — inspect it via `hookErrorCount`/`getHookErrors()`.

## Entities

`@studnicky/logger/entities` exports every schema namespace in `src/entities`, including serializable log records, bodies, faults, levels, statuses, and transport options.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->

```typescript
import { LogRecordEntity } from "@studnicky/logger/entities";
```

## Interfaces

`@studnicky/logger/interfaces` exports every TypeScript interface in `src/interfaces`, including logger configuration, metadata, schema, and request contracts.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->

```typescript
import type { LoggerOptionsInterface } from "@studnicky/logger/interfaces";
```

Entity source files import `JSONSchema` and `FromSchema` directly from `json-schema-to-ts` and `ValidateFunction` directly from `ajv`. Both dependencies are declared directly by `@studnicky/logger`; dependency-owned types are not proxy-exported.

## Exports

| Symbol                   | Purpose                                                                                     | Import path                    |
| ------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------ |
| `Logger`                 | Creates loggers and emits structured entries.                                               | `@studnicky/logger/node`       |
| `LogBody`                | Creates validated immutable non-fault log entries.                                          | `@studnicky/logger/node`       |
| `LogFault`               | Creates validated immutable fault log entries.                                              | `@studnicky/logger/node`       |
| `ConsoleTransport`       | Writes log records to the console.                                                          | `@studnicky/logger/node`       |
| `FunctionTransport`      | Delivers log records to a supplied function.                                                | `@studnicky/logger/node`       |
| `MemoryTransport`        | Captures log records in memory.                                                             | `@studnicky/logger/node`       |
| `NoOpTransport`          | Discards log records.                                                                       | `@studnicky/logger/node`       |
| `TransportInterface`     | Defines the contract for custom transports.                                                 | `@studnicky/logger/interfaces` |
| `ParseLogLevel`          | Normalizes named and numeric log levels.                                                    | `@studnicky/logger/node`       |
| `EVENT_COMPONENTS`       | Provides supported event-component values.                                                  | `@studnicky/logger/node`       |
| `LOG_LEVEL`              | Provides numeric log-level values.                                                          | `@studnicky/logger/node`       |
| `LOG_STATUS`             | Provides supported log-status values.                                                       | `@studnicky/logger/node`       |
| `STATUS_CATEGORIES`      | Groups log statuses for result filtering.                                                   | `@studnicky/logger/node`       |
| `CircularReferenceError` | Represents circular-reference serialization failures.                                       | `@studnicky/logger/node`       |
| `ConfigurationError`     | Represents invalid logger configuration.                                                    | `@studnicky/logger/node`       |
| `FileDestinationError`   | Represents file transport destination failures.                                             | `@studnicky/logger/node`       |
| `InvalidLogLevelError`   | Represents invalid log-level configuration.                                                 | `@studnicky/logger/node`       |
| `LogBuildError`          | Represents invalid log-entry construction.                                                  | `@studnicky/logger/node`       |
| `LogSerializationError`  | Represents a value the platform JSON serializer rejects; the platform error is the `cause`. | `@studnicky/logger/node`       |
| `LogStatusEntity`        | Provides the schema and type for structured log statuses.                                   | `@studnicky/logger/entities`   |
| `LoggerError`            | Base error for logger failures.                                                             | `@studnicky/logger/node`       |

## Try it

The examples below run in the browser via the embedded playground.

### Lifecycle hooks

Run this one to watch a logger instrument itself in real time: an `info` call fires `onLog`, a `debug` call below the configured floor fires `onDropped` instead, creating a child logger fires `onChildCreate`, and — because the only transport attached here throws on every write — `onTransportError` fires too, catching the failure rather than letting it take down the rest of the call. None of this required touching `Logger`'s public surface.

<RunnableExample src="packages/logger/examples/observedLogger" title="Logger lifecycle hooks" />

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/logger)
