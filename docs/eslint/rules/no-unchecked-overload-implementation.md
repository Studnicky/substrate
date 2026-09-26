---
title: '@studnicky/no-unchecked-overload-implementation'
description: 'Disallows an overload set whose implementation signature the checker cannot prove satisfies every declared overload.'
---

# @studnicky/no-unchecked-overload-implementation

Disallows an overloaded function or method whose implementation signature is not provably related to every overload signature it implements. TypeScript relates an overload set to its implementation loosely: it does not require the implementation's return type to be assignable to each overload's declared return type, nor each overload's parameter types to be assignable to the implementation's parameters. An overload can declare a type the implementation never actually produces, and the compiler stays silent — this is a cast in other syntax, since callers reading the overload signature see a promise the runtime body does not keep.

This rule uses the real `ts.TypeChecker.isTypeAssignableTo` to check both directions: the implementation's return type must be assignable to each overload's declared return type, and each overload's parameter types must be assignable to the implementation's parameters. A signature pair that each derive the compared type from their own type parameters — the ordinary shape of a genuinely generic implementation — is treated as proven without a naked assignability check, since two independently-declared type parameters of the same name are otherwise unrelated symbols even when the implementation is sound for every instantiation.

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
