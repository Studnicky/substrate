---
title: '@studnicky/v8/conditional-property-assignment'
description: 'Disallows conditional this-property assignment inside a constructor.'
---

# @studnicky/v8/conditional-property-assignment

V8 assigns an object a hidden class based on the shape (set and order of properties) established during construction. When a constructor assigns `this.x` only inside an `if` branch, instances that take different branches end up with different hidden classes, forcing every call site that touches the instance into megamorphic (or at best polymorphic) property access instead of a fast monomorphic one. Assign every property unconditionally in the constructor — compute the conditional value first, then assign it once.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
class CircuitBreaker {
  #successThreshold: number;

  constructor(options: CircuitBreakerOptionsInterface) {
    if (options.successThreshold !== undefined) {
      this.#successThreshold = options.successThreshold;
    }
  }
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
class CircuitBreaker {
  #successThreshold: number;

  constructor(options: CircuitBreakerOptionsInterface) {
    this.#successThreshold = options.successThreshold ?? 1;
  }
}
```
