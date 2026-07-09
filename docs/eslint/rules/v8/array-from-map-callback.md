---
title: '@studnicky/v8/array-from-map-callback'
description: 'Disallows the two-argument Array.from(iterable, mapFn) form.'
---

# @studnicky/v8/array-from-map-callback

`Array.from(iterable, mapFn)` pays real iterator-protocol and per-element call overhead. Measured on Node v24 (2,000,000 iterations, JIT-warmed), a manual `new Array(n)` plus an index-assignment fill loop runs roughly 58x faster than the two-argument `Array.from` form for the same output. Prefer manual index-fill, or drop the map argument and use single-argument `Array.from(iterable)`.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
const a = Array.from({ length: n }, (_, i) => i * 2);
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const a = new Array(n);
for (let i = 0; i < n; i++) { a[i] = i * 2; }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const a = Array.from(iterable);
```
