---
title: '@studnicky/config'
description: Configuration validation utilities and type guards.
---

# @studnicky/config

> Configuration validation utilities and type guards.

## Install

```bash
pnpm add @studnicky/config
```

## Usage

```typescript
import { ConfigValidation, TypeGuards } from '@studnicky/config';

// Validate required fields in a config object
ConfigValidation.requireString(config, 'apiUrl');
ConfigValidation.requireNumber(config, 'timeout');

// Type guards
if (TypeGuards.isString(value)) {
  // value is string
}

if (TypeGuards.isNonNullObject(value)) {
  // value is Record<string, unknown>
}
```

### ensureError

```typescript
import { ensureError } from '@studnicky/config';

try {
  await doWork();
} catch (thrown) {
  const err = ensureError(thrown); // always an Error
  log.error(err.message);
}
```

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/config` | `ConfigValidation`, `TypeGuards`, `ConfigurationError`, `ensureError` |
| `@studnicky/config/errors` | `ConfigurationError`, `ensureError` |
| `@studnicky/config/validation` | `ConfigValidation`, `TypeGuards` |

## Extending

`ConfigValidation` is a pure-static class. Extend with domain-specific validators:

```typescript
import { ConfigValidation } from '@studnicky/config';

class AppConfigValidation extends ConfigValidation {
  static requirePositiveNumber(config: Record<string, unknown>, key: string): void {
    ConfigValidation.requireNumber(config, key);
    if ((config[key] as number) <= 0) {
      throw new Error(`${key} must be positive`);
    }
  }
}
```

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/config)
