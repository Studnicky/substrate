---
title: '@studnicky/types'
description: Shared zero-runtime utility types and type-guard helpers.
---

# @studnicky/types

> Shared zero-runtime utility types and type-guard helpers for `@studnicky/substrate`.

## Install

```bash
pnpm add @studnicky/types
```

## Usage

`Guard` provides type-safe narrowing accessors for wire-format values. `Empty` produces fresh empty collection instances and predicates. Type utilities (`JsonValueType`, `DeepReadonlyType`, `DeepMergeType`) are erased at compile time and carry no runtime cost:

<<< ../../packages/types/examples/guard-accessors.ts#usage

## Try it

<RunnableExample src="packages/types/examples/guard-accessors" title="Guard accessors, type predicates, and Empty producers" />

The output shows `Guard.isRecord`/`asRecord`/`asRecordArray` narrowing, scalar accessors, the `StrictGuard` static-override subclass, and `Empty` producing and testing fresh zero-value collection instances.

## JSON runtime guards (`JsonObject`, `JsonValue`)

`JsonObjectType` and `JsonValueType` are compile-time-only annotations — they narrow nothing at runtime. `JsonObject` and `JsonValue` are the runtime counterparts: pure-static guard classes that actually inspect a value and narrow or coerce it, for the boundary where a payload is genuinely `unknown` (a deserialized blob, a generic tool return, `JSON.parse` output).

`JsonObject.is` is a type-guard predicate narrowing `unknown` to `JsonObjectType`:

<!-- inline-ts-ok: JsonObject/JsonValue have no dedicated runnable example region; guard-accessors.ts#usage covers Guard/Empty only -->

```typescript
import { JsonObject } from '@studnicky/types';

const parsed: unknown = JSON.parse(responseText);

if (JsonObject.is(parsed)) {
  // parsed is JsonObjectType (Record<string, unknown>) here
}
```

`JsonValue.from` is cast-free coercion: rather than asserting `value as JsonValueType` — a lie when the value is a function, `undefined`, symbol, or bigint — it walks the value and returns a real `JsonValueType`. Primitives pass through, arrays and plain objects recurse field-wise, and anything not representable in JSON becomes `null`:

<!-- inline-ts-ok: JsonObject/JsonValue have no dedicated runnable example region; guard-accessors.ts#usage covers Guard/Empty only -->

```typescript
import { JsonValue } from '@studnicky/types';

const raw: unknown = await fetchApiResponse();
const safe = JsonValue.from(raw); // JsonValueType, never a lie
```

Use the `Type`-suffixed exports (`JsonObjectType`, `JsonValueType`) to annotate a value you already trust. Use `JsonObject`/`JsonValue` to actually narrow or coerce a value you don't yet trust.

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/types` | All types + `Guard` + `Empty` + `JsonObject` + `JsonValue` |
| `@studnicky/types/types` | `JsonValueType`, `JsonObjectType`, `DeepReadonlyType`, `DeepMergeType`, `JsonSchemaType`, `JsonSchemaObjectType`, `JsonSchemaTypeNameType` |
| `@studnicky/types/guards` | `Guard`, `Empty`, `JsonObject`, `JsonValue` |

## Extending

`Guard` is a pure-static class. Extend it and `static override isRecord` to customise record detection; `asRecord` and `asRecordArray` delegate through `this.isRecord`, so overrides propagate automatically. The subclass pattern is demonstrated in the usage example above.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/types)
