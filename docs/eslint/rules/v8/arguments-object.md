---
title: '@studnicky/v8/arguments-object'
description: 'Disallows the arguments object in functions.'
---

# @studnicky/v8/arguments-object

Disallows use of the `arguments` object inside functions. The `arguments` object prevents V8 from optimizing the function because it must handle the dynamic object allocation. Use rest parameters (`...args`) instead.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
function sum() {
  let total = 0;
  for (let i = 0; i < arguments.length; i++) {
    total += arguments[i] as number;
  }
  return total;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function first() {
  return arguments[0];
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
function sum(...args: number[]): number {
  let total = 0;
  for (let i = 0; i < args.length; i++) { total += args[i] ?? 0; }
  return total;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function first(...args: unknown[]): unknown {
  return args[0];
}
```
