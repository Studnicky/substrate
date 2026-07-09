---
title: '@studnicky/interfaces-compose-named-types'
description: 'Disallows inline object-literal types inside interface bodies.'
---

# @studnicky/interfaces-compose-named-types

Disallows inline object literal types (`TSTypeLiteral`) anywhere inside an `interface` body — property types, method return types, and index signature value types. Interfaces must compose by referencing named types: extract the inline shape to an entity (`export namespace XxxEntity { Schema, Type, validate }`) and reference its `Type` instead. A bare type alias is not a valid extraction target, since free-standing type aliases are separately forbidden outside entities. Generic type-parameter constraints (`interface Foo<T extends { a: number }>`) are exempt, since the object literal there constrains a parameter rather than shaping a member.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// inline object property type inside an interface
interface Foo { bar: { a: number }; }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// method signature returning an inline object type
interface Foo { method(): { a: number }; }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// index signature with an inline object value type
interface Foo { [key: string]: { a: number }; }
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// references a named type instead of an inline shape
interface Foo { bar: BarType; }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// generic type-parameter constraint — exempt, not a member shape
interface Foo<T extends { a: number }> { bar: T; }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// method signature with no inline object literal
interface Foo { greet(): void; }
```
