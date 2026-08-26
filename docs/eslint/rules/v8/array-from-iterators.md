---
title: '@studnicky/v8/array-from-iterators'
description: 'Disallows manually draining a non-array iterable into a fresh array.'
---

# @studnicky/v8/array-from-iterators

Disallows a narrow manual iterable drain: a fresh empty array declared immediately before a `for...of` loop whose sole body statement pushes that loop binding. It applies only when type services prove the iterable is not an array or tuple; without that proof it reports nothing. Accumulating into an existing or non-empty array and copying or filtering an array remain outside its scope.

For a 5,000,000-entry `Set` in Node v24, `Array.from(set)` takes 5.64 ms and `[...set]` takes 5.57 ms. A `for...of` plus `push` takes 42.50 ms, 7.53× slower, while preallocation plus index filling takes 30.01 ms. Use `Array.from(iterable)` or `[...iterable]`; the two forms are performance-neutral in this measurement.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
const values: number[] = [];
for (const value of sourceSet) {
  values.push(value);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const entries: readonly [string, number][] = [];
for (const entry of sourceMap) {
  entries.push(entry);
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const values = Array.from(sourceSet);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const entries = [...sourceMap];
```
