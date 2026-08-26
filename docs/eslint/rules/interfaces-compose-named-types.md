---
title: '@studnicky/interfaces-compose-named-types'
description: 'Contract interfaces reference named entities for inline pure-data portions.'
---

# @studnicky/interfaces-compose-named-types

Requires valid contract interfaces to reference named schema-derived entity types for inline pure-data portions.

The rule examines inline object literals and mapped types inside retained contract interfaces. It reports a portion only when the shared classifier determines it is pure data. Inline callable, constructor, runtime, readonly, brand, or other contract objects are legitimate interface structure. Bare `string`, `number`, and `boolean` members do not need extraction.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## Rule boundary

The rule runs after interface declaration-shape classification:

1. [`interface-must-be-contract`](./interface-must-be-contract.md) owns an interface that contains only pure data.
2. This rule skips that pure-data interface to avoid a second root diagnostic.
3. This rule inspects a retained contract interface for inline pure-data portions.
4. Each pure-data portion is extracted to a schema-derived entity and referenced through its named `Type`.

The constraint declaration of a generic type parameter is outside this rule. A member that refers to that parameter is still checked through its resolved constraint, so a pure-data shape cannot be hidden behind `T`. The same resolution applies to indexed member access such as `Source['value']`.

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
interface UserReaderInterface {
  read(): {
    id: string;
    name: string;
  };
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
interface RegistryInterface {
  readonly entries: {
    [key: string]: {
      id: string;
      enabled: boolean;
    };
  };
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
interface BigInterface {
  a: { x: string; y: string };
  b: string;
}

interface WrapperInterface {
  run(): void;
  value: BigInterface['a'];
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
interface HandlerInterface<T extends { a: string; b: string } = never> {
  run(): void;
  handler: T;
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
interface ServiceInterface {
  run(): void;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
interface FetchOptionsInterface {
  (): void;
  readonly 'headers'?: Record<string, string>;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
interface SchedulerInterface {
  (): void;
  readonly 'handle': ReturnType<typeof setTimeout>;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
interface DispatcherInterface {
  handler: (() => void) | { a: 1 };
}
```

Each pure-data portion is extracted to a schema-derived entity and referenced through its named `Type`.

## Scoped exceptions

Source comments and per-member allow lists do not change classification. Disable the rule only for an explicitly scoped flat-config file set:

```js
export default [
  {
    files: ['src/**/*.ts'],
    rules: {
      '@studnicky/interfaces-compose-named-types': 'error'
    }
  },
  {
    files: ['generated/**/*.ts'],
    rules: {
      '@studnicky/interfaces-compose-named-types': 'off'
    }
  }
];
```

## Related rules

- [`interface-must-be-contract`](./interface-must-be-contract.md) owns pure-data interface declarations.
- [`type-alias-invariants`](./type-alias-invariants.md) verifies canonical alias provenance and declaration shape.
- [`all-types-are-entities`](./all-types-are-entities.md) owns canonical alias placement.
- [`no-mixed-callable-shapes`](./no-mixed-callable-shapes.md) owns a member whose type mixes a callable constituent with data — this rule skips that constituent rather than telling the consumer to extract it, since the underlying shape must split instead.
