---
title: '@studnicky/v8/chained-array-iteration'
description: 'Disallows chaining map() and filter() calls.'
---

# @studnicky/v8/chained-array-iteration

Disallows chaining `.map()` and `.filter()` calls onto one another — `.map().filter()` or `.filter().map()`. Each call in the chain allocates a new intermediate array and iterates the collection separately. A single `.reduce()` call transforms and filters in one pass with one allocation.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
const names = users.filter((u) => u.active).map((u) => u.name);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const doubled = values.map((v) => v * 2).filter((v) => v > 0);
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const names = users.reduce<string[]>((acc, u) => {
  if (u.active) { acc.push(u.name); }
  return acc;
}, []);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const doubled = values.reduce<number[]>((acc, v) => {
  const next = v * 2;
  if (next > 0) { acc.push(next); }
  return acc;
}, []);
```
