---
title: '@studnicky/no-unchecked-overload-implementation'
description: 'Disallows an overload set whose implementation signature the checker cannot prove satisfies every declared overload.'
---

# @studnicky/no-unchecked-overload-implementation

Disallows an overloaded function or method whose implementation signature is not provably related to every overload signature it implements. TypeScript relates an overload set to its implementation loosely: it does not require the implementation's return type to be assignable to each overload's declared return type, nor each overload's parameter types to be assignable to the implementation's parameters. An overload can declare a type the implementation never actually produces, and the compiler stays silent — this is a cast in other syntax, since callers reading the overload signature see a promise the runtime body does not keep.

This rule checks both directions: the implementation's return type must relate to each overload's declared return type, and each overload's parameter types must relate to the implementation's parameters. When both signatures declare the same number of type parameters, it first tries alpha-equivalence — walking the two types in parallel, treating the overload's type parameter at each position as identical to the implementation's type parameter at the same position, and otherwise demanding the same structural shape (matching union arity, matching generic target, matching property set) recursively. Two independently-declared type parameter objects of the same conceptual role are otherwise unrelated symbols to the checker, so this is what lets a genuinely generic implementation pass without a naked assignability check. A shape mismatch — an overload's single return type folded into an implementation's wider union, for instance — fails alpha-equivalence and falls through to a real `ts.TypeChecker.isTypeAssignableTo` check, which correctly rejects it: the implementation might resolve to the union member the overload never promised.

**Fixable:** No · **Options:** No

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
class Compose {
  private static keepProperties<TProps extends Record<string, unknown>, TKeys extends keyof TProps & string>(
    source: TProps, keySet: ReadonlySet<TKeys>
  ): Pick<TProps, TKeys>;
  private static keepProperties(source: Record<string, unknown>, keySet: ReadonlySet<string>): Record<string, unknown> {
    return {};
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function useValue(value: string): void;
function useValue(value: number): void {}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
interface Box<T> { value: T; }
interface Other<T> { other: T; }
function makeBox<T>(v: T): Box<T>;
function makeBox<T>(v: T): Box<T> | Other<T> {
  return { value: v };
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
function wrapValue<T>(value: T): { readonly value: T };
function wrapValue<T>(value: T): { readonly value: T } {
  return { value };
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function widen(value: string): string | number;
function widen(value: string): string {
  return value;
}
```

## Rationale

`keepProperties`'s overload promises callers a `Pick<TProps, TKeys>` — the exact subset of keys they asked for, correctly typed per key. The implementation returns `Record<string, unknown>`, a type with no memory of which keys were requested or what their real value types are. For any `TProps`/`TKeys` instantiation narrower than the implementation's own erased shape, `Record<string, unknown>` is not assignable to `Pick<TProps, TKeys>` — a caller reading the overload's declared return type is reading a promise the implementation never proves, and the compiler's own loose overload-to-implementation check does not catch it. The same defect shape recurs across this codebase's schema builders: an implementation typed against `SchemaNodeInterface<unknown, unknown>` while its overloads declare `SchemaNodeInterface<TSchema & {...}, ...>` is the identical erasure, one level of generic nesting deeper.

`useValue`'s two signatures are the non-generic case: an overload promising a `string` parameter matched against an implementation that only accepts `number` is unsound the moment a caller reads the overload signature and passes a string — the implementation has no way to accept it, despite the overload declaring that it can.

`makeBox`'s overload promises `Box<T>`. The implementation's declared return, `Box<T> | Other<T>`, does derive from its own type parameter — the shape a naive "both sides are generic" check would wave through — but a union is not the same shape as its own member: a caller reading the `Box<T>` overload has no guarantee the implementation actually returns a `Box`, since nothing forces it to pick that branch of the union for this call. Alpha-equivalence sees the union-vs-single-type shape mismatch, falls back to a real assignability check, and `Box<T> | Other<T>` is not assignable to `Box<T>`.
