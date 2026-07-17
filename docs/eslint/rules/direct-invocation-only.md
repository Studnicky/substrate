---
title: '@studnicky/direct-invocation-only'
description: 'Disallows .bind(), .call(), and .apply() on callable receivers.'
---

# @studnicky/direct-invocation-only

Disallows `.bind()`, `.call()`, and `.apply()` on callable receivers. When TypeScript type services are available the rule confirms the receiver is a `Function` via the type checker before reporting. Refactor to use arrow functions or pass arguments directly.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
fn.call(thisArg, arg1);
fn.apply(thisArg, args);
const bound = fn.bind(thisArg);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
class MyClass {
  run() { setTimeout(this.handler.bind(this), 100); }
  handler() { /* ... */ }
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Call directly — no binding needed
fn(arg1);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Arrow function preserves lexical this
class MyClass {
  run() { setTimeout(() => { this.handler(); }, 100); }
  handler() { /* ... */ }
}
```
