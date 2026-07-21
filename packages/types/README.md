# @studnicky/types

> Shared runtime type-guard and object helpers for @studnicky/substrate

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/types)

`@studnicky/types` provides runtime guards for narrowing untrusted values, a recursive JSON validation/coercion boundary, empty-value helpers, and defined-property selection.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/types
```

## Usage

### Runtime guards

`Guard` narrows `unknown` values returned from external APIs, JSON payloads, or any dynamically typed source:

```typescript
import { Guard } from '@studnicky/types';

const raw: unknown = await fetchApiResponse();

// Narrow to Record<string, unknown>
if (Guard.isObject(raw)) {
  const name = raw['name'];
  if (Guard.isString(name)) {
    console.log(name);
  }
  const age = Guard.asNumber(raw['age']);
  const note = Guard.asStringOrNull(raw['note']);
}

// Type guard form
if (Guard.isObject(raw)) {
  console.log(Object.keys(raw));
}

// Narrowing arrays of records (non-record elements are filtered out)
const items = Guard.asRecordArray(raw);
```

### JSON values

`JsonObject.is` performs a shallow plain-object check and narrows `unknown` to `Record<string, unknown>`. `JsonValue` validates or coerces recursive JSON data. Its public signatures use the canonical `JSONSchema7Type` imported directly from its owner, `json-schema`:

```typescript
import type { JSONSchema7Type } from 'json-schema';

import { JsonValue } from '@studnicky/types';

const candidate: unknown = JSON.parse(responseText);

if (JsonValue.is(candidate)) {
  const value: JSONSchema7Type = candidate;
  console.log(value);
}

const safe = JsonValue.from({ nested: [1, undefined] });
// { nested: [1, null] }
```

Import `JSONSchema7Type` from `json-schema` when a public signature or local annotation needs the type. Its declarations come from this package's direct `@types/json-schema` dependency. This package exports runtime boundaries rather than aliases for dependency-owned JSON types.

### Assembling options objects (`PickDefined`)

`PickDefined.from` strips `undefined`-valued keys from a record and narrows each remaining value's type away from `undefined`. It assembles an options object directly from a mix of required and optional values, replacing a manual spread-ternary chain with one call:

```typescript
import { PickDefined } from '@studnicky/types';

interface RateLimiterOptionsInterface {
  requestsPerSecond: number;
  burstSize: number;
  clock?: () => number;
}

const options: RateLimiterOptionsInterface = PickDefined.from({
  requestsPerSecond: 10,
  burstSize: 20,
  clock: undefined, // omitted from the result
});
```

## Extending

For `Guard`, override the static `isObject` predicate in a subclass to customise record detection. Because `asRecordArray` delegates through `this.isObject`, overrides propagate automatically:

```typescript
import { Guard } from '@studnicky/types';

class StrictGuard extends Guard {
  public static override isObject(value: unknown): value is Record<string, unknown> {
    return super.isObject(value) && Object.getPrototypeOf(value) === Object.prototype;
  }
}

if (StrictGuard.isObject(payload)) {
  console.log(Object.keys(payload));
}
```

## Public API

Import `Empty`, `Guard`, `JsonObject`, `JsonValue`, and `PickDefined` from the package root. The package has one code entrypoint.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/types

## License

MIT
