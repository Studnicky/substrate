---
title: '@studnicky/v8/array-splice-outside-loops'
description: 'Disallows Array.splice inside loop bodies.'
---

# @studnicky/v8/array-splice-outside-loops

Disallows `.splice()` calls inside any loop body (`for`, `while`, `do...while`, `for...of`, `for...in`). `Array.splice` is O(n) per call because it shifts every trailing element; calling it every iteration makes the loop O(n²). Build a new array and swap it in once, or filter out-of-place instead of mutating in a loop.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
for (let i = items.length - 1; i >= 0; i--) {
  if (!items[i].active) { items.splice(i, 1); }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const id of staleIds) {
  const index = records.findIndex((r) => r.id === id);
  records.splice(index, 1);
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
items = items.filter((item) => item.active);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const staleSet = new Set(staleIds);
records = records.filter((r) => !staleSet.has(r.id));
```
