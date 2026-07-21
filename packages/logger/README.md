# @studnicky/logger

> Pluggable logging interface with transport architecture for Node.js

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/logger)

`@studnicky/logger` provides a typed `LoggerInterface` with a pluggable transport system and immutable structured log data. Every log entry is created directly through `LogBody.create(...)` or `LogFault.create(...)`; required fields are enforced by the configuration type and at runtime. Correlation IDs flow from child loggers.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/logger
```

## Usage

```typescript
import { Logger, ConsoleTransport, LogBody, LogFault } from '@studnicky/logger';

const logger = Logger.create({
  level: 'info',
  metadata: { service: 'api' },
  transports: [ConsoleTransport.create()]
});

// Structured info log
const body = LogBody.create({
  component: 'users',
  context: { userId: 'u-123' },
  durationMs: 12,
  message: 'User created',
  operation: 'create',
  status: 'success'
});

logger.info(body);

// Error log from a caught exception
try {
  throw new Error('Database timeout');
} catch (cause) {
  if (!(cause instanceof Error)) throw cause;

  const fault = LogFault.create({
    cause: cause.cause instanceof Error ? cause.cause.message : undefined,
    component: 'users',
    context: { userId: 'u-123' },
    message: cause.message,
    name: cause.name,
    operation: 'create',
    stack: cause.stack,
    status: 'failed'
  });

  logger.error(fault);
}

// Child logger for correlation IDs
const requestLogger = logger.child({ requestId: 'req-abc', userId: 'u-123' });
requestLogger.info(body);
```

## Transport architecture

The `Logger` core emits `LogRecordEntity.Type` records to each configured transport. A Logger with no transports is valid and silent.

```typescript
import pino from 'pino';

import {
  Logger,
  ConsoleTransport,
  MemoryTransport,
  FunctionTransport,
  ParseLogLevel
} from '@studnicky/logger';
import type { LogRecordEntity, TransportInterface } from '@studnicky/logger';

// Fan-out: console (warn+) and memory capture for tests
const memory = MemoryTransport.create();
const logger = Logger.create({
  level: 'debug',
  transports: [
    ConsoleTransport.create({ level: 'warn' }), // only warn and above
    memory                                       // all records at or above global floor
  ]
});

logger.info(body);  // reaches memory only
logger.warn(body);  // reaches both

// Assert a snapshot of captured records in tests
const records = memory.records();
records[0]?.level;    // LOG_LEVEL.WARN
records[0]?.metadata; // { service: 'api' }
records[0]?.data;     // LogBodyDataEntity.Type or LogFaultDataEntity.Type
memory.clear();

// Bridge to an external logger via FunctionTransport
const pinoLogger = pino();
const bridged = Logger.create({
  transports: [FunctionTransport.create((record) => pinoLogger.info(record.metadata, record.data.message))]
});

// Implement your own transport
class RemoteTransport implements TransportInterface {
  #minLevel: number;

  constructor(options: { level?: string } = {}) {
    this.#minLevel = ParseLogLevel.parse(options.level ?? 'trace');
  }

  write(record: LogRecordEntity.Type): void {
    if (record.level < this.#minLevel) return;
    // send to remote sink
  }
}
```

## Per-transport level filtering

Each transport accepts an optional `level` option that adds an independent filter above the Logger global floor:

```typescript
const logger = Logger.create({
  level: 'debug',
  transports: [
    ConsoleTransport.create({ level: 'debug' }), // debug and above
    ConsoleTransport.create({ level: 'warn' }), // warn and above only
  ]
});
```

Entity namespaces own serializable logger data. Use `LogBodyConfigEntity.Type` and `LogFaultConfigEntity.Type` for direct construction input, `LogDataEntity.Type` for the schema-defined body-or-fault union, and `LogRecordEntity.Type`, `LogBodyDataEntity.Type`, `LogFaultDataEntity.Type`, `LogLevelEntity.Type`, and `LogStatusEntity.Type` for normalized data from `@studnicky/logger`. `CloudWatchLogSchemaFieldsEntity` owns the CloudWatch envelope fields and `LoggerHookEventKindEntity` owns observed hook discriminants. Entity implementations import `JSONSchema` and `FromSchema` directly from `json-schema-to-ts` and `ValidateFunction` directly from `ajv`, with both packages declared as direct dependencies.

## Hook failures

`Logger` composes a plain `@studnicky/errors` `HookInvoker` with no override, so a throwing `onLog`, `onDropped`, or `onChildCreate` propagates the default `HookInvocationError` to the caller. `onTransportError` is the one hook Logger itself guards: a throwing `onTransportError` override is caught and recorded instead of aborting fan-out to the remaining transports. Inspect recorded failures via `hookErrorCount`/`getHookErrors()`:

```typescript
class FaultyLogger extends Logger {
  protected override onTransportError(): void {
    throw new Error('boom');
  }
}
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/logger

## License

MIT
