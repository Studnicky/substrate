---
title: '@studnicky/logger'
description: Pluggable logging with transport architecture, child loggers, and structured builders.
---

# @studnicky/logger

> Pluggable logging interface with transport architecture, child loggers, and metadata support for Node.js.

## Install

```bash
pnpm add @studnicky/logger
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

Build a `Logger` instance with `Logger.create`, attach transports, then pass structured `LogBody` or `LogFault` entries to the log methods:

<<< ../../packages/logger/examples/01-memory-transport.ts#usage

## LogBody and LogFault builders

`LogBody` and `LogFault` are fluent builders that enforce required fields (`component`, `operation`, `status`, `message`, `context`) at build time. `LogFault` adds `name` and a `fromError()` convenience. Missing required fields throw `LogBuildError`:

<<< ../../packages/logger/examples/02-log-builders.ts#usage

## Fan-out and level filtering

Pass multiple transports to `Logger.create`. Each transport has its own level floor; entries below the floor are silently dropped. Child loggers share all parent transports and merge their metadata into every record:

<<< ../../packages/logger/examples/03-fanout.ts#usage

## Custom transports

Implement `TransportInterface` directly for a custom sink. `ResolveMinLevel.from()` resolves the same level-floor behavior the built-in transports use, so a custom transport's constructor validates and defaults `level` the same way:

<<< ../../packages/logger/examples/04-custom-transport.ts#usage

## Observability hooks

Subclass `Logger`, `LogBody`, or `LogFault` and override any of the protected hooks below to inject tracing, metrics, or debug logging without modifying the class itself.

| Hook | Class | When it fires | Args |
|------|-------|---------------|------|
| `onFieldSet` | `BaseLogEntryBuilder` | After each fluent setter call | `field: string, value: unknown` |
| `onBuild` | `BaseLogEntryBuilder` | After `build()` assembles the frozen result | `result: LogBodyDataType \| LogFaultDataType` |
| `onBuildError` | `BaseLogEntryBuilder` | When a required field is missing and `build()` is about to throw | `field: string` |
| `onLog` | `Logger` | After a record is assembled, before fan-out to transports | `level: LogLevelType, record: LogRecordType` |
| `onDropped` | `Logger` | When a record is below the logger's level floor and is discarded | `level: LogLevelType` |
| `onChildCreate` | `Logger` | After a child logger is created via `.child()` | `bindings: LogMetadataType` |
| `onTransportError` | `Logger` | When a transport's `write()` throws | `transport: TransportInterface, record: LogRecordType, error: unknown` |

<<< ../../packages/logger/examples/observedLogger.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

`Logger` composes a plain `HookInvoker` with no override, so a throwing `onLog`, `onDropped`, or `onChildCreate` propagates the default `HookInvocationError` to the caller rather than being recorded. `onTransportError` is the one hook `Logger` itself guards: a throwing override is caught and recorded instead of aborting fan-out to the remaining transports — inspect it via `hookErrorCount`/`getHookErrors()`.

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/logger` | `Logger`, `LogBody`, `LogFault`, `ConsoleTransport`, `FunctionTransport`, `MemoryTransport`, `NoOpTransport`, `LoggerOptionsEntity`, `parseLogLevel`, `ResolveMinLevel`, `safeStringify` |
| `@studnicky/logger/builders` | Builder classes |
| `@studnicky/logger/constants` | Log level constants |
| `@studnicky/logger/errors` | Logger error classes |
| `@studnicky/logger/interfaces` | Interface types |
| `@studnicky/logger/transports` | Transport classes and `TransportInterface` |
| `@studnicky/logger/types` | `LogStatusType` and other type aliases |

## Try it

The examples below run in the browser via the embedded playground.

### Builder

The builder wires level, metadata, and transports before calling `build()` — the resulting logger is already configured for fan-out and level filtering.

<RunnableExample src="packages/logger/examples/builder-logger" title="Logger builder" />

### Lifecycle hooks

Each log call fires `onLog`, filtered calls fire `onDropped`, and transport failures surface via `onTransportError` — all without modifying Logger's public API.

<RunnableExample src="packages/logger/examples/observedLogger" title="Logger lifecycle hooks" />

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/logger)
