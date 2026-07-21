---
title: Getting Started
description: Install and use @studnicky/substrate packages in a Node.js project.
---

# Getting Started

## Requirements

- Node.js 24 or later
- pnpm (or npm/yarn)

## Installing from GitHub Packages

Packages are published to the GitHub Package Registry under the `@studnicky` scope. Add the registry to your `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

Then install any package:

```bash
pnpm add @studnicky/cache
```

Import public code from the package root, such as `@studnicky/cache`.

## Minimal usage example

<!-- inline-ts-ok: consumer-facing snippet using the published package-root import -->
```typescript
import { LruCache } from '@studnicky/cache';

const users = LruCache.create<string, { name: string }>({
  capacity: 100,
  ttlMs: 60_000
});

users.set('user-42', { name: 'Ada' });

const user = users.get('user-42');
```

## Extending a primitive

Every class exposes documented protected seams. Most are observer hooks for tracing and metrics; some packages also expose behavioral hooks that intentionally transform or redirect control flow. Subclass to add observability without touching the base class:

<!-- inline-ts-ok: consumer-facing subclass illustration using the published package-root import -->
```typescript
import { LruCache } from '@studnicky/cache';

class InstrumentedCache extends LruCache<string, { name: string }> {
  protected override onHit(key: string, value: { name: string }): void {
    console.log(`[cache] hit key=${key} name=${value.name}`);
  }

  protected override onMiss(key: string): void {
    console.log(`[cache] miss key=${key}`);
  }
}

const cache = InstrumentedCache.create<string, { name: string }>({ capacity: 100 });
cache.get('user-42');
```

The base `LruCache` class never logs; observer hooks are no-ops by default. Override only what you need, and check each package page for which hooks are observational versus behavioral.

## Next steps

- [Architecture](/architecture): the three design principles in depth
- [Packages](/packages/): the full workspace package index with API examples
