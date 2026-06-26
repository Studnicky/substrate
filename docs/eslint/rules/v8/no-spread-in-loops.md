---
title: '@studnicky/v8/no-spread-in-loops'
description: 'Disallows array spread assignments inside for loops.'
---

# @studnicky/v8/no-spread-in-loops

Disallows array spread (`[...result, item]`) in assignment inside `for` loop bodies. Each spread creates a new array and copies all existing elements, producing O(n²) work. Accumulate with `.push()` instead.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
let result: string[] = [];
for (const item of items) {
  result = [...result, item];
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
let merged: number[] = [];
for (let i = 0; i < pages.length; i++) {
  merged = [...merged, ...pages[i]];
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const result: string[] = [];
for (const item of items) {
  result.push(item);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Spread outside loop is fine
const merged = pages.flat();
```
