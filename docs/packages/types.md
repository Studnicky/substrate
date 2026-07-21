---
title: '@studnicky/types'
description: Runtime type guards, JSON boundaries, empty-value helpers, and defined-property selection.
---

# @studnicky/types

> Runtime type-guard and object helpers for `@studnicky/substrate`.

## Install

```bash
pnpm add @studnicky/types
```

## Usage

`Guard` provides type-safe narrowing accessors for wire-format values. `Empty` produces fresh empty collection instances and predicates. `JsonObject` and `JsonValue` implement runtime JSON boundaries. `PickDefined` assembles objects without retaining `undefined` properties.

<<< ../../packages/types/examples/guard-accessors.ts#usage

## Try it

<RunnableExample src="packages/types/examples/guard-accessors" title="Guard accessors, type predicates, and Empty producers" />

The output shows `Guard.isObject`/`asRecordArray` narrowing, scalar guards and coercions, the `StrictGuard` static-override subclass, `Empty` producers and predicates, and a JSON value boundary.

## JSON runtime boundaries

### `JsonObject`

`JsonObject.is` performs a shallow plain-object check and narrows `unknown` to `Record<string, unknown>`. It rejects arrays, `Map`, `Set`, class instances, and other non-plain objects.

<!-- inline-ts-ok: conceptual boundary example -->
```typescript
import { JsonObject } from '@studnicky/types';

const parsed: unknown = JSON.parse(responseText);

if (JsonObject.is(parsed)) {
  const id = parsed.id;
  console.log(id);
}
```

Use schema validation when object members also need structural guarantees.

### `JsonValue`

`JsonValue.is` narrows `unknown` to the canonical `JSONSchema7Type` owned by `json-schema`. `JsonValue.from` recursively coerces unsupported values to `null`, producing a finite, acyclic `JSONSchema7Type` without a cast.

<!-- inline-ts-ok: conceptual boundary example -->
```typescript
import type { JSONSchema7Type } from 'json-schema';

import { JsonValue } from '@studnicky/types';

const candidate: unknown = JSON.parse(responseText);

if (JsonValue.is(candidate)) {
  const value: JSONSchema7Type = candidate;
  console.log(value);
}

const safe: JSONSchema7Type = JsonValue.from({
  nested: [1, undefined]
});
```

Import `JSONSchema7Type` directly from `json-schema` when a public signature or local annotation needs the type. Its declarations come from the package's direct `@types/json-schema` dependency. `@studnicky/types` exports the runtime boundary, not a type alias for the dependency-owned JSON type.

## Assembling options objects (`PickDefined`)

`PickDefined.from` strips `undefined`-valued keys from a record, narrowing each remaining value away from `undefined`. It assembles direct configuration objects from required and optional fields.

<<< ../../packages/types/examples/pickDefined.ts#usage

## Try it (`PickDefined`)

<RunnableExample src="packages/types/examples/pickDefined" title="Assembling configuration with PickDefined" />

The output shows direct configuration with required defaults and an optional `clock` field that is present only when defined.

## Public API

Import `Empty`, `Guard`, `JsonObject`, `JsonValue`, and `PickDefined` from `@studnicky/types`.

## Extending

`Guard` is a pure-static class. Extend it and override `static isObject` to customise record detection. `asRecordArray` delegates through `this.isObject`, so overrides propagate automatically.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/types)
