---
title: '@studnicky/no-caller-chosen-guard-type'
description: 'Disallows a type-guard call or declaration whose narrowed type a caller can pick rather than the runtime check proving it.'
---

# @studnicky/no-caller-chosen-guard-type

Disallows a type-guard call whose narrowed type (`x is P`) a caller chooses rather than the runtime check proving it, and disallows declaring a type-predicate guard whose predicate a caller can pick freely. A runtime check like `instanceof` proves membership in a type, not which type parameter a caller had in mind — `instanceof Set` proves membership in `Set<unknown>` at best, never a specific element type. Two doors let a caller substitute a type the check never proved: an explicit type argument at the call site, and an inferred type argument that resolves through a library's own `any` (`SetConstructor['prototype']` is typed `Set<any>`) and therefore bridges to whatever the caller's binding expects. Both are a cast in other syntax — a value flows through a call that looks like a genuine narrowing and comes out typed as something the check never checked.

This rule reports three shapes. First, a call to a generic type-predicate function or method where the predicate mentions one of the callee's own type parameters and the caller supplies that type parameter explicitly. Second, the same call shape when the caller supplies no explicit type argument, but the argument the checker infers resolves — anywhere in its structure, through unions, generic type arguments, or object members — to `any`. Third, a type-predicate function or method declaration whose predicate is a bare type parameter that no parameter's own type ever constrains, since nothing at the declaration stops a caller instantiating it with whatever type they choose.

**Fixable:** No · **Options:** No

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
function isInstanceOf<Instance>(value: unknown, ctor: Function & { readonly 'prototype': Instance }): value is Instance {
  return value instanceof ctor;
}

class Container<T> { value?: T; }
declare const existing: unknown;

if (isInstanceOf<Container<number>>(existing, Container)) {}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function isInstanceOf<Instance>(value: unknown, ctor: Function & { readonly 'prototype': Instance }): value is Instance {
  return value instanceof ctor;
}

declare const existing: unknown;

if (isInstanceOf(existing, Map)) {}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function pickAny<T>(value: unknown): value is T {
  return true;
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
function isInstanceOf<Instance>(value: unknown, ctor: Function & { readonly 'prototype': Instance }): value is Instance {
  return value instanceof ctor;
}

class MyClass {}
declare const existing: unknown;

if (isInstanceOf(existing, MyClass)) {}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function isString<T>(value: T): value is string & T {
  return typeof value === 'string';
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
declare const value: unknown;

if (Array.isArray(value)) {}
```

## Rationale

`isInstanceOf<Container<number>>(existing, Container)` reads like a proven narrowing, but `instanceof Container` proves membership in `Container<unknown>` at best — the `<number>` came from the caller, not from anything the runtime check verified. `isInstanceOf(existing, Map)` never names an explicit type argument, but `MapConstructor['prototype']` is typed `Map<any, any>` in lib, so the inferred `Instance` bridges through that `any` to whatever the caller's binding expects downstream — the same defect, reached through inference instead of syntax. `pickAny<T>(value: unknown): value is T` has the identical defect at its source: nothing about `value: unknown` constrains `T`, so every caller picks their own `T` and the guard rubber-stamps it.

`isInstanceOf(existing, MyClass)` is fine because `MyClass` is not generic — `MyClass['prototype']` is typed `MyClass`, with no `any` anywhere in it, so the inferred `Instance` is exactly what the `instanceof` check proves. `isString<T>(value: T): value is string & T` derives its predicate from `T`, the type of its own parameter — the caller's `T` is whatever the argument's type already is, not a free choice made independent of it. `Array.isArray` has no type parameters at all; its predicate, `arg is any[]`, is fixed by the declaration.
