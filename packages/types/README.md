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

`Predicates` narrows `unknown` values returned from external APIs, JSON payloads, or any dynamically typed source:

```typescript
import { Predicates } from '@studnicky/types/node';

const raw: unknown = await fetchApiResponse();

// Narrow to Record<string, unknown>
if (Predicates.isObject(raw)) {
  const name = raw['name'];
  if (Predicates.isString(name)) {
    console.log(name);
  }
  const age = Predicates.asNumber(raw['age']);
  const note = Predicates.asStringOrNull(raw['note']);
}

// Type guard form
if (Predicates.isObject(raw)) {
  console.log(Object.keys(raw));
}

// Narrowing arrays of records (non-record elements are filtered out)
const items = Predicates.asRecordArray(raw);
```

### Structural runtime values

`Predicates.areDeeplyEqual` compares primitives, `Date`, `RegExp`, arrays, `Map`, `Set`, and records recursively. It recognizes `NaN`, preserves array order, ignores `Map` and `Set` insertion order, and safely compares cyclic object graphs without treating different graph topologies as equal. `Predicates.hasCycle` traverses records, arrays, `Map` keys and values, and `Set` members.

```typescript
const left = new Map([[{ id: 1 }, new Set([{ enabled: true }])]]);
const right = new Map([[{ id: 1 }, new Set([{ enabled: true }])]]);

Predicates.areDeeplyEqual(left, right); // true
Predicates.hasCycle(left); // false
```

### JSON values

`JsonObject.is` performs a shallow plain-object check and narrows `unknown` to `Record<string, unknown>`. `JsonValue` validates or coerces recursive JSON data. Its public signatures use the canonical `JSONSchema7Type` imported directly from its owner, `json-schema`:

```typescript
import type { JSONSchema7Type } from 'json-schema';

import { JsonValue } from '@studnicky/types/node';

const candidate: unknown = JSON.parse(responseText);

if (JsonValue.is(candidate)) {
  const value: JSONSchema7Type = candidate;
  console.log(value);
}

const safe = JsonValue.from({ nested: [1, undefined] });
// { nested: [1, null] }
```

Import `JSONSchema7Type` from `json-schema` when a public signature or local annotation needs the type. Its declarations come from this package's direct `@types/json-schema` dependency. This package exports runtime boundaries rather than aliases for dependency-owned JSON types.

### Runtime values

RuntimeValue accepts a runtime operand when it contains JSON data or undefined together with native Date, Map, Set, array, and plain-record values. It rejects functions, symbols, bigints, non-finite numbers, class instances, invalid nested values, and cycles. Map keys remain intact.

```typescript
import { RuntimeValue } from '@studnicky/types/node';

const candidate: unknown = new Map([[{ id: 1 }, new Set([new Date(0), undefined])]]);

if (RuntimeValue.is(candidate)) {
  const operand = RuntimeValue.intake(candidate);
  console.log(operand);
}
```

Use JsonValue for JSON-only data. RuntimeValue preserves native values for consumers that deliberately operate on them.

### Assembling options objects (`PickDefined`)

`PickDefined.from` strips `undefined`-valued keys from a record and narrows each remaining value's type away from `undefined`. It assembles an options object directly from a mix of required and optional values, replacing a manual spread-ternary chain with one call:

```typescript
import { PickDefined } from '@studnicky/types/node';

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

For `Predicates`, override the static `isObject` predicate in a subclass to customise record detection. Because `asRecordArray` delegates through `this.isObject`, overrides propagate automatically:

```typescript
import { Predicates } from '@studnicky/types/node';

class StrictPredicates extends Predicates {
  public static override isObject(value: unknown): value is Record<string, unknown> {
    return super.isObject(value) && Object.getPrototypeOf(value) === Object.prototype;
  }
}

if (StrictPredicates.isObject(payload)) {
  console.log(Object.keys(payload));
}
```

## Public API

Import runtime helpers from `@studnicky/types/node` or `@studnicky/types/browser`.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/types

## License

MIT
