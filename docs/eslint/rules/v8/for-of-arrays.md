---
title: '@studnicky/v8/for-of-arrays'
description: 'Disallows for...of over arrays; prefer index loops.'
---

# @studnicky/v8/for-of-arrays

Disallows `for...of` over arrays or tuples. When type services are available the rule uses the TypeScript checker to confirm the iterated value is an array type. Without type services, only literal array expressions are flagged. Use a counted `for` loop for arrays — index access on typed arrays is faster than the iterator protocol.

**Fixable:** No · **Options:** No · **When enabled by `createEslintConfig()`:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const item of arr) {
  process(item);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const item of [1, 2, 3]) {
  total += item;
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
for (let i = 0; i < arr.length; i++) {
  const item = arr[i];
  if (item !== undefined) { process(item); }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// for...of over non-array iterables (Set, Map, generator) is fine
for (const [key, value] of map) {
  register(key, value);
}
```
