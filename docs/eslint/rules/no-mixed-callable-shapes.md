---
title: '@studnicky/no-mixed-callable-shapes'
description: 'A single type position is callable or it is data, never both.'
---

# @studnicky/no-mixed-callable-shapes

Forbids a union or intersection type from mixing a callable/constructable constituent with a data constituent.

A declaration is a function (and belongs in an interface) or it is data (and belongs in a schema-derived type). TypeScript has no syntax for an interface that is itself a union, so `type X = (() => void) | { a: 1 };` has no interface remedy — `type-alias-invariants`'s `aliasMustBeInterface` advice is impossible to follow for this shape. This rule owns the diagnostic instead and directs a split.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## Detection

The rule inspects every union and intersection type node in the file, at any nesting depth — inside object type members, array and tuple element types, and type-reference type arguments. A union or intersection mixes shapes when at least one constituent is callable/constructable and at least one other constituent is data:

- a function type or constructor type (`() => void`, `new () => T`) is callable;
- a type literal with a call, construct, or method signature is callable;
- a named reference is resolved through its declaration — a callable interface (one with a call or construct signature, including inherited through heritage) or a type alias whose body is callable makes the reference callable;
- `Array`, `Readonly`, and `ReadonlyArray` are data, regardless of their element type;
- everything else (object literals, primitives, other named references) is data.

`undefined`, `null`, and `never` constituents are neutral — they never make a union mixed on their own, so `(() => void) | undefined` is a single optional-callable shape, not a mix.

A purely callable union (`(() => void) | (() => number)`) or a purely data union (`{ a: 1 } | { b: 2 }`) is not reported. `type-alias-invariants` continues to own the purely callable case with its `aliasMustBeInterface` advice, since converting that shape to an interface is possible.

## ✗ Incorrect

### Union of callable and data

<!-- inline-ts-ok: eslint rule example -->
```ts
type MixedType = (() => void) | { a: 1 };
```

### Intersection of data and callable

<!-- inline-ts-ok: eslint rule example -->
```ts
type MixedIntersectionType = { a: 1 } & (() => void);
```

### Named callable reference mixed with data

<!-- inline-ts-ok: eslint rule example -->
```ts
type CallbackType = () => void;
type IndirectMixedType = CallbackType | { a: 1 };
```

### Nested inside a property

<!-- inline-ts-ok: eslint rule example -->
```ts
type NestedMixedType = {
  readonly slot: (() => void) | { a: 1 };
};
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
type DispatcherType = (() => void) | ((value: string) => void);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
type MaybeCallbackType = (() => void) | undefined;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
type EitherDataType = { a: 1 } | { b: 2 };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
type PolymorphicFactoryType<TInstance> = Function & { readonly 'prototype': TInstance };
```

Consumers that need either shape split the callable contract and data representation before composing them at the use site.

## Rule boundary

[`interfaces-compose-named-types`](./interfaces-compose-named-types.md) extracts the pure-data portions of a valid contract interface into named entities. When an interface member's type mixes a callable constituent with data, this rule owns the diagnostic instead — `interfaces-compose-named-types` skips a data constituent that sits inside a mixed union or intersection so the consumer gets one actionable diagnostic, not two contradictory ones.

## Configuration

The rule takes no options and recognizes no comment, declaration-name, or path exemptions. Enable or disable the complete rule through flat configuration:

```js
export default [
  {
    files: ['src/**/*.ts'],
    rules: {
      '@studnicky/no-mixed-callable-shapes': 'error'
    }
  },
  {
    files: ['generated/**/*.ts'],
    rules: {
      '@studnicky/no-mixed-callable-shapes': 'off'
    }
  }
];
```

## Related rules

- [`type-alias-invariants`](./type-alias-invariants.md) owns the purely callable and purely data alias cases.
- [`interfaces-compose-named-types`](./interfaces-compose-named-types.md) extracts pure-data portions from contract interfaces, and defers to this rule on a mixed constituent.
- [`interface-must-be-contract`](./interface-must-be-contract.md) rejects pure-data interfaces.
