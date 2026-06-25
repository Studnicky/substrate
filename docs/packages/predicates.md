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

<<< ../../packages/predicates/examples/typeInference.ts#usage

### String validation

<<< ../../packages/predicates/examples/stringAndNumeric.ts#string

### Numeric validation

<<< ../../packages/predicates/examples/stringAndNumeric.ts#numeric

### Array validation

<<< ../../packages/predicates/examples/arrayAndObject.ts#array

### Object validation

<<< ../../packages/predicates/examples/arrayAndObject.ts#object

### Enum and const

<<< ../../packages/predicates/examples/arrayAndObject.ts#enum

### Coercion

<<< ../../packages/predicates/examples/stringAndNumeric.ts#coercion

### Content encoding and media type

<<< ../../packages/predicates/examples/arrayAndObject.ts#content

## Try it

<RunnableExample src="packages/predicates/examples/typeInference" title="JSON Schema type inference and numeric guards" />

The output shows `inferValueType` mapping JS values to JSON Schema type names, `isFiniteNumber`/`isIntegerValue` narrowing numerics, and `matchesType`/`matchesAnyType` performing union-aware dispatch.

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
