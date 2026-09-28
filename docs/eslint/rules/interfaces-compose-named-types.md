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

The constraint declaration of a generic type parameter is outside this rule. A member that refers to that parameter is still checked through its resolved constraint, so a pure-data shape cannot be hidden behind `T`. A bare type-parameter reference and an indexed-access reference into a separately-declared shape (`a: Big['a']`) each launder an inline pure-data shape away from direct inspection — the parameter's own `extends { ... }` constraint, or the indexed property's own declared type, is the actual shape a consumer sees, even though neither is written inline at the member. For an indexed-access member, the rule resolves the reference to the `TypeNode` that declares the referenced property's shape and classifies that resolved shape as if it were written inline at the member; without this resolution the indexed-access node itself reads to the interface contract classifier as inert type-level computation, and the shape escapes detection entirely.

A bare `string`/`number`/`boolean` member is never extracted, even when the enclosing interface is a retained contract: there is no shape worth naming for a scalar with no structure. This is scoped to a direct interface member only — a bare scalar nested inside a union, tuple, or array member (`values: string[]`, where the array itself is the shape worth extracting) is unaffected, and a type-alias root of `type IdType = string;` is separately rejected by `type-alias-invariants` as a primitive forwarding alias.

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
