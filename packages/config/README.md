# @studnicky/config

> Configuration validation utilities and type guards

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/config)

`@studnicky/config` provides pure-static assertion and clamping classes for validating configuration objects at runtime. Assertions skip `undefined`/`null` values and throw `ConfigurationError` on failure, making them safe to compose for partial or fully optional config shapes.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/config
```

## Usage

```typescript
import {
  ConfigValidation,
  ConfigurationError,
} from '@studnicky/config';

const KNOWN_KEYS = new Set<string>(['host', 'port', 'debug']);

function validateServerConfig(raw: Record<string, unknown>): void {
  // Reject unknown keys first
  ConfigValidation.assertNoUnknownKeys(raw, KNOWN_KEYS);

  // Assert types — each call is a no-op when the value is undefined/null
  ConfigValidation.assertString(raw['host'], 'host');
  ConfigValidation.assertNumber(raw['port'], 'port');
  ConfigValidation.assertBoolean(raw['debug'], 'debug');

}

// Valid input — passes silently
validateServerConfig({ host: 'localhost', port: 3000, debug: false });

// Invalid input — throws ConfigurationError
try {
  validateServerConfig({ host: 42, port: 3000, debug: false });
} catch (err) {
  if (err instanceof ConfigurationError) {
    console.error(err.message); // "host must be a string"
    console.error(err.code);    // "config.invalid"
  }
}

```

## Extending

`ConfigValidation` is a pure-static class. Override the protected `onValidationError` static method to throw a domain-specific error type instead of `ConfigurationError`:

```typescript
import { ConfigValidation } from '@studnicky/config';

class AppConfigValidation extends ConfigValidation {
  protected static override onValidationError(message: string): never {
    throw new Error(`[app] ${message}`);
  }
}

// Now all assertions throw your custom error
try {
  AppConfigValidation.assertString(123, 'apiKey');
} catch (err) {
  if (err instanceof Error) {
    console.error(err.message); // "[app] apiKey must be a string"
  }
}
```

## Clamping

`ClampedConfig` is the soft-correction sibling to `ConfigValidation`'s hard-fail assertions: given a flat config object and a declarative table of `{min, max, reason}` per numeric field, `apply` returns a **new** object with out-of-range numeric fields clamped into range instead of throwing. Fields not present in the rule table, not numeric, or already in range are copied through unchanged; the input is never mutated.

```typescript
import { ClampRuleEntity, ClampedConfig } from '@studnicky/config';

interface WorkerConfig {
  timeoutMs: number;
  concurrency: number;
}

const rules: Readonly<Record<string, ClampRuleEntity.Type>> = {
  timeoutMs: { min: 100, max: 5000, reason: 'timeout must stay within safe bounds' },
  concurrency: { min: 1, max: 8, reason: 'concurrency must stay within pool capacity' },
};

const raw: WorkerConfig = { timeoutMs: 10, concurrency: 4 };
const clamped = ClampedConfig.apply(raw, rules);
// clamped.timeoutMs === 100, clamped.concurrency === 4, raw is unchanged
```

Override the protected `onClamp` static method to observe clamp events — logging is the caller's responsibility, `ClampedConfig` has no dependency on any logging package:

```typescript
import { ClampEventEntity, ClampedConfig } from '@studnicky/config';

class LoggingClampedConfig extends ClampedConfig {
  protected static override onClamp(event: ClampEventEntity.Type): void {
    console.warn(`[config] clamped ${event.field}: ${event.raw} -> ${event.clamped} (${event.reason})`);
  }
}

LoggingClampedConfig.apply(raw, rules);
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/config

## License

MIT
