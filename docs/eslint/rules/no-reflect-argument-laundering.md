---
title: '@studnicky/no-reflect-argument-laundering'
description: 'Disallows calling a typed function or constructor through Reflect.apply/Reflect.construct with arguments its signature does not accept, and its any-typed result flowing unchecked.'
---

# @studnicky/no-reflect-argument-laundering

Disallows two related uses of `Reflect.apply`/`Reflect.construct` as a cast in other syntax. Both accept `args: any[]`, so calling a typed function or constructor through them skips the argument check a direct call would get — a caller can pass an argument list the target's real signature does not accept, and the compiler has nothing to say, because as far as it can see the call site is typed `any[]` in, `any` out. This rule resolves the target's real signature with the TypeScript `Program` the linted file already has, checks the supplied argument list (an array literal, or a typed tuple expression) against it with `ts.TypeChecker.isTypeAssignableTo`, and reports a mismatch.

`Reflect.apply`/`Reflect.construct` also return `any`. Even a correctly-typed call launders that `any` back into typed code the moment its result is used directly — assigned without an annotation, member-accessed, or passed into an untyped position. This rule additionally requires the result to flow immediately into an `unknown`-typed binding, parameter, or return, so the caller is forced through a real narrowing guard before touching it.

The subclass-aware `create()` factory pattern — `Reflect.construct(this, [options])` inside a static factory typed `this: new (options: X) => TInstance`, immediately bound to an `unknown`-typed local and guarded with `instanceof` before use — satisfies both checks and is not reported.

**Fixable:** No · **Options:** No

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
function greet(name: string): string { return name; }
const result = Reflect.apply(greet, undefined, [42]);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
class Counter {
  public constructor(start: number) {}
}
console.log(Reflect.construct(Counter, [1]).toString());
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
function greet(name: string): string { return name; }
const result: unknown = Reflect.apply(greet, undefined, ['world']);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
class Base {
  public static create(
    this: new (config: { readonly value: string }) => Base,
    config: { readonly value: string }
  ): unknown {
    const result: unknown = Reflect.construct(this, [config]);
    return result;
  }
}
```

## Rationale

`Reflect.apply`/`Reflect.construct` exist to forward a call whose target isn't known until runtime — the subclass-aware factory pattern that reconstructs `this` is the legitimate case. Used on a statically-known target, they are functionally a double assertion: the target has a real signature, but routing the call through `any[]` in and `any` out removes the compiler's ability to check either side. A test fixture that builds an invalid config object and calls the target directly gets a compile error at the call site; the same fixture routed through `Reflect.apply` compiles clean and only fails — or worse, silently passes — at runtime, moving a type error from build time to test time for no reason but the extra indirection.
