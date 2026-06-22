# @studnicky/logger

> Pluggable logging interface with Pino wrapper, child loggers, and metadata support for Node.js

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/logger)

`@studnicky/logger` provides a typed `LoggerInterface` with structured log builders and five ready-to-use implementations. Every log entry is constructed via the `LogBody` or `LogFault` builder — required fields are enforced at build time. Correlation IDs flow from child loggers, not from the builders.

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
import { PinoLogger, LogBody, LogFault, NoOpLogger } from '@studnicky/logger';

const logger = PinoLogger.create({ level: 'info' });

// Structured info log
const body = LogBody.create()
  .component('users')
  .operation('create')
  .status('success')
  .message('User created')
  .context({ userId: 'u-123' })
  .duration(12)
  .build();

logger.info(body);

// Error log from a caught exception
try {
  throw new Error('Database timeout');
} catch (err) {
  const fault = LogFault.create()
    .component('users')
    .operation('create')
    .status('failed')
    .fromError(err as Error)
    .context({ userId: 'u-123' })
    .build();

  logger.error(fault);
}

// Child logger for correlation IDs
const requestLogger = logger.child({ requestId: 'req-abc', userId: 'u-123' });
requestLogger.info(body);
```

## Extending

Combine loggers with `FanOutLogger` to broadcast to multiple sinks, or implement `LoggerInterface` directly:

```typescript
import { FanOutLogger, PinoLogger, SpyLogger, NoOpLogger } from '@studnicky/logger';
import type { LoggerInterface } from '@studnicky/logger/interfaces';

// Fan-out to console + test spy
const primary = PinoLogger.create({ level: 'info' });
const spy = SpyLogger.wrap(NoOpLogger.create());
const logger = FanOutLogger.create([primary, spy]);

// In tests: assert what was logged
const entries = spy.entries;
console.log(entries[0]?.message);
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/logger

## License

MIT
