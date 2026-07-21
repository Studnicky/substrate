---
title: '@studnicky/logger'
description: Pluggable logging with transport architecture, child loggers, and immutable structured entries.
---

# @studnicky/logger

> Pluggable logging interface with transport architecture, child loggers, and metadata support for Node.js.

## Install

```bash
pnpm add @studnicky/logger
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

Create a `Logger` with one configuration object, attach transports, then pass structured `LogBody` or `LogFault` entries to the log methods:

<<< ../../packages/logger/examples/01-memory-transport.ts#usage

## Immutable LogBody and LogFault configuration

`LogBody.create(config)` and `LogFault.create(config)` validate one readonly configuration
object and return an immutable normalized entry. Both require `component`, `operation`,
`status`, `message`, and `context`; faults also require `name`. Missing required fields throw
`LogBuildError`. The usage example above exercises both factories directly from the package
root.

## Fan-out and level filtering

Pass multiple transports to `Logger.create`. Each transport has its own level floor; entries below the floor are silently dropped. Child loggers share all parent transports and merge their metadata into every record:

<<< ../../packages/logger/examples/03-fanout.ts#usage

## Custom transports

Implement `TransportInterface` directly for a custom sink. Use the root-exported `ParseLogLevel.parse()` when the transport accepts named or numeric level configuration:

<<< ../../packages/logger/examples/04-custom-transport.ts#usage

## Observability hooks

Subclass `Logger` and override the protected hooks below to inject tracing, metrics, or debug logging without modifying the class itself.

| Hook | Class | When it fires | Args |
|------|-------|---------------|------|
| `onLog` | `Logger` | After a record is assembled, before fan-out to transports | `level: LogLevelEntity.Type, record: LogRecordEntity.Type` |
| `onDropped` | `Logger` | When a record is below the logger's level floor and is discarded | `level: LogLevelEntity.Type` |
| `onChildCreate` | `Logger` | After a child logger is created via `.child()` | `bindings: LogMetadataInterface` |
| `onTransportError` | `Logger` | When a transport's `write()` throws | `transport: TransportInterface, record: LogRecordEntity.Type, error: unknown` |

<<< ../../packages/logger/examples/observedLogger.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

`Logger` composes a plain `HookInvoker` with no override, so a throwing `onLog`, `onDropped`, or `onChildCreate` propagates the default `HookInvocationError` to the caller rather than being recorded. `onTransportError` is the one hook `Logger` itself guards: a throwing override is caught and recorded instead of aborting fan-out to the remaining transports — inspect it via `hookErrorCount`/`getHookErrors()`.

## Declaration boundaries

Serializable log records, bodies, faults, levels, and statuses are owned by their entity namespaces: `LogRecordEntity.Type`, `LogBodyDataEntity.Type`, `LogFaultDataEntity.Type`, `LogLevelEntity.Type`, and `LogStatusEntity.Type`. Runtime and access contracts remain interfaces, including `TransportInterface` and `LogMetadataInterface`.

Entity source files import `JSONSchema` and `FromSchema` directly from `json-schema-to-ts` and `ValidateFunction` directly from `ajv`. Both dependencies are declared directly by `@studnicky/logger`; dependency-owned types are not proxy-exported.

## Public API

Import logger classes, immutable entry factories, transports, entities, constants, errors, and contracts from `@studnicky/logger`. The package root is the sole code entrypoint.

## Try it

The examples below run in the browser via the embedded playground.

### Lifecycle hooks

Each log call fires `onLog`, filtered calls fire `onDropped`, and transport failures surface via `onTransportError` — all without modifying Logger's public API.

<RunnableExample src="packages/logger/examples/observedLogger" title="Logger lifecycle hooks" />

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/logger)
