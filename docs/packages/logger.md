---
title: '@studnicky/logger'
description: Pluggable logging with Pino wrapper, child loggers, and structured builders.
---

# @studnicky/logger

> Pluggable logging interface with Pino wrapper, child loggers, and metadata support for Node.js.

## Install

```bash
pnpm add @studnicky/logger
```

## Usage

```typescript
import { ConsoleLogger, LogBody, LogFault } from '@studnicky/logger';

const logger = ConsoleLogger.create({ level: 'info', prefix: '[App]' });

// Structured log with required fields
const body = LogBody.create()
  .component('UserService')
  .operation('createUser')
  .status('success')
  .message('User created')
  .context({ userId: '123' })
  .duration(45)
  .build();

logger.info(body);
```

### Pino logger

```typescript
import { PinoLogger } from '@studnicky/logger';

const logger = PinoLogger.create({ metadata: { service: 'api-layer' } });

// Error with fault builder
try {
  await processRequest();
} catch (err) {
  const fault = LogFault.create()
    .component('RequestHandler')
    .operation('processRequest')
    .status('failed')
    .fromError(err)
    .context({ requestId: ctx.requestId })
    .build();

  logger.error(fault);
}
```

### Child loggers

```typescript
const requestLogger = logger.child({ requestId: '789', traceId: 'abc' });
requestLogger.info('Processing request'); // includes requestId/traceId in all entries
```

### Fan-out and no-op

```typescript
import { FanOutLogger, NoOpLogger } from '@studnicky/logger';

// Broadcast to multiple loggers
const fanOut = new FanOutLogger([pinoLogger, cloudLogger]);

// Silent logger for tests
const silent = new NoOpLogger();
```

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/logger` | `ConsoleLogger`, `ConsoleLoggerBuilder`, `FanOutLogger`, `LogBody`, `LogFault`, `NoOpLogger`, `PinoLogger`, `PinoLoggerBuilder`, `SpyLogger` |
| `@studnicky/logger/builders` | Builder classes |
| `@studnicky/logger/constants` | Log level constants |
| `@studnicky/logger/errors` | Logger error classes |
| `@studnicky/logger/interfaces` | Interface types |
| `@studnicky/logger/types` | `LogStatusType` and other type aliases |

## Extending

`ConsoleLogger` exposes a protected `createChild` hook:

```typescript
import { ConsoleLogger } from '@studnicky/logger';

class CorrelatedLogger extends ConsoleLogger {
  protected override onChildCreate(metadata: Record<string, unknown>): void {
    metrics.increment('logger.child.created');
  }
}
```

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/logger)
