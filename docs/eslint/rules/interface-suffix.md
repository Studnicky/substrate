---
title: '@studnicky/interface-suffix'
description: "Requires every interface declaration's name to end with 'Interface'."
---

# @studnicky/interface-suffix

Requires every `interface` declaration's name to end with `Interface`, with no exemptions — including interfaces declared inside a namespace. The suffix makes interfaces visually distinct from type aliases and classes at every call site, so a reader never has to check the declaration to know what kind of symbol they're looking at.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// top-level interface missing the Interface suffix
interface Foo { readonly x: number; }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// namespace-nested interface missing the suffix — no namespace exemption
namespace X {
  interface Foo { readonly x: number; }
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// interface name ends with Interface
interface FooInterface { readonly x: number; }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// namespace-nested interface with the suffix — not flagged
namespace X {
  interface FooInterface { readonly x: number; }
}
```
