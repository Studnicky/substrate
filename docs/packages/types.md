---
title: '@studnicky/types'
description: Runtime type guards and predicates, JSON boundaries, empty-value producers, and defined-property selection.
---

# @studnicky/types

> Runtime type-guard, predicate, and object helpers for `@studnicky/substrate`.

## Install

```bash
pnpm add @studnicky/types
```

Runtime helpers publish from both `@studnicky/types/node` and `@studnicky/types/browser`. The examples use the Node path; interfaces publish from `@studnicky/types/interfaces`.

## Usage

`Predicates` is the package's single unified static class for type narrowing, value comparison, and JSON Schema-style validation. `Predicate` composes atomic type guards while preserving their narrowed types: use `and`, `or`, `not`, `field`, `arrayItems`, and `mapEntries` to parse an untrusted value once into a canonical structural shape. `Empty` produces fresh empty collection instances. `JsonObject` and `JsonValue` implement runtime JSON boundaries. `RuntimeValue` validates recursive operands that retain native Date, Map, and Set values. `PickDefined` assembles objects without retaining `undefined` properties.

<<< ../../packages/types/examples/predicates-accessors.ts#usage

## Try it

<RunnableExample src="packages/types/examples/predicates-accessors" title="Predicates accessors, type predicates, and Empty producers" />

The output shows `Predicates.isObject`/`asRecordArray` narrowing, scalar guards, the `StrictPredicates` static-override subclass, `Empty` producers, and a JSON value boundary.

## Structural runtime values

`Predicates.areDeeplyEqual` compares primitives, `Date`, `RegExp`, arrays, `Map`, `Set`, and records recursively. It recognizes `NaN`, preserves array order, ignores `Map` and `Set` insertion order, and compares cyclic graph topology safely. `Predicates.hasCycle` traverses records, arrays, `Map` keys and values, and `Set` members.

<!-- inline-ts-ok: predicate usage -->
```typescript
import { Predicates } from '@studnicky/types/node';

const left = new Map([[{ id: 1 }, new Set([{ enabled: true }])]]);
const right = new Map([[{ id: 1 }, new Set([{ enabled: true }])]]);

Predicates.areDeeplyEqual(left, right); // true
Predicates.hasCycle(left); // false
```

## JSON runtime boundaries

### `JsonObject`

`JsonObject.is` performs a shallow plain-object check and narrows `unknown` to `Record<string, unknown>`. It rejects arrays, `Map`, `Set`, class instances, and other non-plain objects.

<!-- inline-ts-ok: conceptual boundary example -->
```typescript
import { JsonObject } from '@studnicky/types/node';

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

import { JsonValue } from '@studnicky/types/node';

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

## Runtime values

### `RuntimeValue`

`RuntimeValue` validates a runtime operand that combines JSON data and `undefined` with native `Date`, `Map`, `Set`, array, and plain-record values. `RuntimeValue.is` is a typed predicate for composition with `Predicate`. `RuntimeValue.intake` returns the same value after validation and throws `TypeError` for unsupported values.

Map keys and values both follow the contract without conversion. The boundary rejects functions, symbols, bigints, non-finite numbers, non-plain class instances, invalid nested values, and cycles. Use `JsonValue` when the boundary is JSON-only.

<!-- inline-ts-ok: runtime operand boundary -->
```typescript
import { RuntimeValue } from '@studnicky/types/node';

const candidate: unknown = new Map([[{ id: 1 }, new Set([new Date(0), undefined])]]);

if (RuntimeValue.is(candidate)) {
  const operand = RuntimeValue.intake(candidate);
  console.log(operand);
}
```

## Assembling options objects (`PickDefined`)

`PickDefined.from` strips `undefined`-valued keys from a record, narrowing each remaining value away from `undefined`. It assembles direct configuration objects from required and optional fields.

<<< ../../packages/types/examples/pickDefined.ts#usage

## Try it (`PickDefined`)

<RunnableExample src="packages/types/examples/pickDefined" title="Assembling configuration with PickDefined" />

The output shows direct configuration with required defaults and an optional `clock` field that is present only when defined.

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `Predicates` | Type guards, atomic comparators, JSON Schema draft 2020-12 predicates, and value equality/coercion helpers, unified on one static class. | `@studnicky/types/node` |
| `Predicate` | Typed runtime predicate composition for boolean algebra and record, array, and map structure. | `@studnicky/types/node` |
| `PredicateFunctionInterface` | Contract for a runtime predicate that narrows `unknown` to its value type. | `@studnicky/types/interfaces` |
| `Empty` | Produces fresh empty collection instances. | `@studnicky/types/node` |
| `JsonObject` | Narrows values at the plain-object JSON boundary. | `@studnicky/types/node` |
| `JsonValue` | Validates and coerces recursive JSON values. | `@studnicky/types/node` |
| `RuntimeValue` | Typed runtime operand predicate and intake boundary for JSON data plus native Date, Map, and Set values. | `@studnicky/types/node` |
| `RuntimeValueDateInterface` | Native Date operand contract. | `@studnicky/types/interfaces` |
| `RuntimeValueMapInterface` | Native Map operand contract. | `@studnicky/types/interfaces` |
| `RuntimeValueSetInterface` | Native Set operand contract. | `@studnicky/types/interfaces` |
| `RuntimeValueArrayInterface` | Native array operand contract. | `@studnicky/types/interfaces` |
| `RuntimeValueRecordInterface` | Native plain-record operand contract. | `@studnicky/types/interfaces` |
| `PickDefined` | Omits undefined-valued properties from an object. | `@studnicky/types/node` |
| `TIME_ONLY_PATTERN` | Recognizes a time-only string before a consumer applies its own domain semantics. | `@studnicky/types/node` |

### Selected `Predicates` static methods

| Method | Description |
|--------|-------------|
| `isString`/`isNumber`/`isBoolean`/`isFunction`/`isNullish` | Generic-preserving type guards (`<T>(value: T): value is X & T`) — narrow an already-typed value without discarding its declared shape. |
| `isNumberType(value)` | `typeof value === 'number'`, including `NaN`/`Infinity` — use over `isNumber` when the caller routes those values to a more specific downstream check. |
| `isObjectLike`/`isObject`/`isRecord`/`isPlainObject` | Progressively narrower object-shape guards; see each method's doc comment for the exact exclusion each adds. |
| `isMap`/`isSet`/`isDate`/`isArray`/`isRegExp`/`isURL`/`isError` | Type guards for the common non-primitive built-ins. |
| `isEmptyString`/`isEmptyPlainObject`/`isEmptyArray`/`isEmptyMap`/`isEmptySet` | Emptiness checks — pair with `Empty`'s producers of the same five shapes. |
| `areDeeplyEqual(value, other)` | Cycle-safe structural equality for primitive values, Date, RegExp, arrays, Map, Set, and records. |
| `hasCycle(value)` | Detects cycles through records, arrays, Map keys and values, and Set members. |
| `isFiniteNumber(value)` | True for finite `number` values. |
| `isIntegerValue(value)` | True for integer `number` values. |
| `inferValueType(value)` | Returns JSON Schema type name (`'null'`, `'array'`, `'object'`, etc.) |
| `matchesType(schemaType, value)` | True if `value` satisfies the named JSON Schema type. |
| `satisfiesUniqueItems(arr)` | Deep-equal uniqueness check. |
| `satisfiesContentEncoding(value, encoding)` | Validates `base64`/`base64url` encoding. |
| `satisfiesContentMediaType(value, mediaType, encoding?)` | Validates `application/json` content. |

## Extending

`Predicates` is a pure-static class. Extend it and override a `static` method — most commonly `isObject`, to customise record detection — and other methods that delegate through `this.<method>` (e.g. `asRecordArray` delegates through `this.isObject`) will propagate the override automatically.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/types)
