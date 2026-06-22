---
title: '@studnicky/errors'
description: Standardized error hierarchy with cause-chain serialization and error codes.
---

# @studnicky/errors

> Standardized error handling for all modules.

## Install

```bash
pnpm add @studnicky/errors
```

## Usage

```typescript
import { ModuleError, ValidationError, ErrorCode } from '@studnicky/errors';

// Module-scoped error
throw ModuleError.create({
  module: 'UserService',
  message: 'User not found',
  code: ErrorCode.notFound
});

// Validation error with violations
throw new ValidationError({
  message: 'Invalid input',
  violations: [
    { field: 'email', message: 'must be a valid email address' }
  ]
});
```

### BaseError with cause chain

```typescript
import { BaseError } from '@studnicky/errors';

class DatabaseError extends BaseError {
  constructor(message: string, cause?: Error) {
    super({ message, cause });
  }
}

try {
  await db.query(sql);
} catch (err) {
  throw new DatabaseError('Query failed', err instanceof Error ? err : undefined);
}
```

### Error code registry

```typescript
import { ErrorCodeRegistry } from '@studnicky/errors';

const registry = new ErrorCodeRegistry();
registry.register('userNotFound', { message: 'User not found', httpStatus: 404 });
```

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/errors` | `BaseError`, `ModuleError`, `ValidationError`, `CliExitError`, `ErrorCodeRegistry`, `ErrorCode`, `HttpStatus`, `ErrorDefaults` |
| `@studnicky/errors/constants` | `ErrorCode`, `HttpStatus`, `ErrorDefaults`, `CAUSE_CHAIN_DEPTH_LIMIT` |
| `@studnicky/errors/errors` | Error classes |
| `@studnicky/errors/interfaces` | Interface types |
| `@studnicky/errors/types` | `ErrorScenarioType` |

## Extending

All errors extend `BaseError`, which itself extends the native `Error`. Add domain-specific errors by extending `ModuleError`:

```typescript
import { ModuleError } from '@studnicky/errors';
import type { ModuleErrorCreateOptionsInterface } from '@studnicky/errors';

class AuthError extends ModuleError {
  static override create(options: ModuleErrorCreateOptionsInterface): AuthError {
    return new AuthError(options);
  }
}
```

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/errors)
