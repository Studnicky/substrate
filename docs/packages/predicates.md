---
title: '@studnicky/predicates'
description: Static predicate library for JSON Schema draft 2020-12 validation.
---

# @studnicky/predicates

> Type guards, numeric checks, string bounds, array constraints, and coercion helpers aligned to JSON Schema draft 2020-12.

## Install

```bash
pnpm add @studnicky/predicates
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

### Type checks

```typescript
import { Predicates } from '@studnicky/predicates';

Predicates.isFiniteNumber(42);        // true
Predicates.isIntegerValue(3.14);      // false
Predicates.inferValueType(null);      // 'null'
Predicates.inferValueType([]);        // 'array'
Predicates.inferValueType({});        // 'object'

Predicates.matchesType('integer', 5);      // true
Predicates.matchesAnyType(['string', 'null'], null); // true
```

### String validation

```typescript
Predicates.satisfiesMinLength('hello', 3);  // true
Predicates.satisfiesMaxLength('hi', 10);    // true
Predicates.satisfiesPattern('abc', /^a/);   // true
Predicates.codePointLength('👋');           // 1 (counts Unicode code points, not UTF-16 units)
```

### Numeric validation

```typescript
Predicates.checkMinimum(5, 5, false);       // true  (inclusive)
Predicates.checkMinimum(5, 5, true);        // false (exclusive)
Predicates.checkMaximum(10, 10, false);     // true
Predicates.checkMultipleOf(0.3, 0.1);      // true  (epsilon-tolerant)
```

### Array validation

```typescript
Predicates.checkMinItems([1, 2], 2);        // true
Predicates.checkMaxItems([1, 2, 3], 2);     // false
Predicates.checkUniqueItems([1, 2, 1]);     // false
Predicates.satisfiesContains(2, 1, 3);      // true  (matchCount=2 within [1,3])
```

### Object validation

```typescript
Predicates.checkRequired({ a: 1 }, ['a', 'b']);   // false — 'b' missing
Predicates.hasNoAdditionalProperties({ a: 1 }, new Set(['a'])); // true
Predicates.satisfiesMinProperties({ a: 1 }, 2);   // false
Predicates.satisfiesMaxProperties({ a: 1, b: 2 }, 3); // true
```

### Enum and const

```typescript
Predicates.satisfiesEnum('red', ['red', 'green', 'blue']); // true
Predicates.satisfiesConst({ x: 1 }, { x: 1 });            // true (deep equal)
```

### Coercion

```typescript
Predicates.coerceToBoolean('true');   // true
Predicates.coerceToBoolean('1');      // true
Predicates.coerceToBoolean('maybe'); // undefined

Predicates.coerceToNumber('3.14');   // 3.14
Predicates.coerceToNumber('NaN');    // undefined

// Attempt coercion against an ordered list of schema types
Predicates.coerceValue(['integer', 'string'], '42'); // 42
```

### Content encoding and media type

```typescript
// base64 and base64url are actively validated; unknown encodings return true
Predicates.satisfiesContentEncoding('aGVsbG8=', 'base64');     // true
// application/json is actively validated; unknown media types return true
Predicates.satisfiesContentMediaType('{"x":1}', 'application/json'); // true
```

## API

| Export | Type | Description |
|--------|------|-------------|
| `Predicates` | class | Static-only predicate and coercion library |
| `CoerceToBooleanResultType` | type | `boolean \| undefined` |
| `CoerceToNumberResultType` | type | `number \| undefined` |

### Selected `Predicates` static methods

| Method | Description |
|--------|-------------|
| `isFiniteNumber(value)` | True for finite `number` values |
| `isIntegerValue(value)` | True for integer `number` values |
| `inferValueType(value)` | Returns JSON Schema type name (`'null'`, `'array'`, `'object'`, etc.) |
| `matchesType(schemaType, value)` | True if `value` satisfies the named JSON Schema type |
| `matchesAnyType(schemaTypes, value)` | True if `value` satisfies any type in the list |
| `coerceToBoolean(value)` | Coerces string to `boolean`; returns `undefined` for unrecognised literals |
| `coerceToNumber(value)` | Coerces string to finite `number`; returns `undefined` for non-numeric input |
| `coerceValue(schemaTypes, value)` | Tries each coercer in order; returns first successful result |
| `codePointLength(str)` | Counts Unicode code points without allocating |
| `satisfiesMinLength(str, min)` | Fast-path code-point length check |
| `satisfiesMaxLength(str, max)` | Fast-path code-point length check |
| `checkMultipleOf(value, divisor)` | Epsilon-tolerant floating-point multiple check |
| `satisfiesUniqueItems(arr)` | Deep-equal uniqueness check |
| `satisfiesContains(matchCount, min, max)` | Validates `minContains`/`maxContains` bounds |
| `satisfiesContentEncoding(value, encoding)` | Validates `base64`/`base64url` encoding |
| `satisfiesContentMediaType(value, mediaType, encoding?)` | Validates `application/json` content |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/predicates)
