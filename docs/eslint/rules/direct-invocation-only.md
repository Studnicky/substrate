---
title: '@studnicky/direct-invocation-only'
description: 'Disallows Function.prototype.bind, call, and apply on provably callable values.'
---

# @studnicky/direct-invocation-only

Disallows `.bind()`, `.call()`, and `.apply()` when TypeScript parser services prove that the receiver has at least one call signature. Values that are not provably callable, including `any`, are not reported.

The rule checks direct member calls, a banned member used as the final expression in a sequence call, and calls through an alias declared directly from a banned member expression. Alias resolution follows ESLint scope bindings, so shadowed names do not inherit an outer alias.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: conceptual rule example -->
```ts
fn.call(thisArg, argument);
fn.apply(thisArg, argumentsList);
const bound = fn.bind(thisArg);
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
const rebind = fn.bind;
rebind(thisArg);
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
(0, fn.call)(thisArg, argument);
```

## ✓ Correct

<!-- inline-ts-ok: conceptual rule example -->
```ts
fn(argument);
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
class Handler {
  public run(): void {
    setTimeout(() => this.handle(), 100);
  }

  private handle(): void {}
}
```
