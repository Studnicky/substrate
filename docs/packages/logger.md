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

Pass multiple transports to `Logger.create`. Each transport has its own level floor — entries below the floor are silently dropped. Child loggers share all parent transports and merge their metadata into every record:

<<< ../../packages/logger/examples/03-fanout.ts#usage

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/logger` | `Logger`, `LogBody`, `LogFault`, `ConsoleTransport`, `FunctionTransport`, `MemoryTransport`, `NoOpTransport`, `LoggerOptionsEntity`, `parseLogLevel`, `safeStringify` |
| `@studnicky/logger/builders` | Builder classes |
| `@studnicky/logger/constants` | Log level constants |
| `@studnicky/logger/errors` | Logger error classes |
| `@studnicky/logger/interfaces` | Interface types |
| `@studnicky/logger/transports` | Transport classes and `TransportInterface` |
| `@studnicky/logger/types` | `LogStatusType` and other type aliases |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/logger)
