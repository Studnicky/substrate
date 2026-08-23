---
title: '@studnicky/interface-suffix'
description: "Requires every retained contract interface declaration's name to end with 'Interface'."
---

# @studnicky/interface-suffix

Requires every retained contract `interface` declaration's name to end with `Interface`, including interfaces declared inside a namespace. Pure-data interfaces are outside this rule's scope; [`interface-must-be-contract`](./interface-must-be-contract.md) owns their diagnostic. The suffix makes contract interfaces visually distinct from type aliases and classes at every call site.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// contract interface missing the Interface suffix
interface Foo { run(): void; }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// namespace-nested interface missing the suffix — no namespace exemption
namespace X {
  interface Foo { run(): void; }
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// contract interface name ends with Interface
interface FooInterface { run(): void; }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// namespace-nested interface with the suffix — not flagged
namespace X {
  interface FooInterface { run(): void; }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// pure-data interfaces are skipped here; interface-must-be-contract owns them
interface UserRecord {
  id: string;
}
```
