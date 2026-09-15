# @studnicky/config

> Configuration clamping utilities with lifecycle hooks

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/config)

`@studnicky/config` provides `ClampedConfig`, a pure-static utility that returns a new configuration object with numeric fields constrained to declared bounds.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/config
```

## Usage

`ClampedConfig` is a soft-correction utility: given a flat config object and a declarative table of `{minimum, maximum, reason}` per numeric field, `apply` returns a **new** object with out-of-range numeric fields clamped into range instead of throwing. Fields not present in the rule table, not numeric, or already in range are copied through unchanged; the input is never mutated.

```typescript
import { ClampedConfig } from '@studnicky/config/node';
import { ClampRuleEntity } from '@studnicky/config/entities';

interface WorkerConfig {
  timeoutMs: number;
  concurrency: number;
}

const rules: Readonly<Record<string, ClampRuleEntity.Type>> = {
  timeoutMs: { minimum: 100, maximum: 5000, reason: 'timeout must stay within safe bounds' },
  concurrency: { minimum: 1, maximum: 8, reason: 'concurrency must stay within pool capacity' },
};

const raw: WorkerConfig = { timeoutMs: 10, concurrency: 4 };
const clamped = ClampedConfig.apply(raw, rules);
// clamped.timeoutMs === 100, clamped.concurrency === 4, raw is unchanged
```

Override the protected `onClamp` static method to observe clamp events — logging is the caller's responsibility, `ClampedConfig` has no dependency on any logging package:

```typescript
import { ClampedConfig } from '@studnicky/config/node';
import { ClampEventEntity } from '@studnicky/config/entities';

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
