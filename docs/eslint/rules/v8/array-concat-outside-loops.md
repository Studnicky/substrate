---
title: '@studnicky/v8/array-concat-outside-loops'
description: 'Disallows Array.concat inside for loops.'
---

# @studnicky/v8/array-concat-outside-loops

Disallows `.concat()` calls in assignment inside `for` loop bodies. `Array.concat` creates a new array on every iteration, producing O(n²) allocations. Accumulate with `.push()` or pre-allocate the result array instead.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
let result: number[] = [];
for (let i = 0; i < items.length; i++) {
  result = result.concat(items[i] ?? []);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
let merged: string[] = [];
for (const batch of batches) {
  merged = merged.concat(batch);
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const result: number[] = [];
for (let i = 0; i < items.length; i++) {
  const item = items[i];
  if (item !== undefined) { result.push(item); }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Flat concatenation outside the loop
const merged = batches.flat();
```
