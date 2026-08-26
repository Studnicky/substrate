---
title: '@studnicky/v8/for-of-arrays'
description: 'Reports for...of over arrays, tuples, and resolved Array iterator methods; use an index loop.'
---

# @studnicky/v8/for-of-arrays

Reports `for...of` when TypeScript resolves the iterated expression as an array or tuple. With type services it also resolves standard-library `Array` and `ReadonlyArray` calls to `.entries()`, `.values()`, and `.keys()`, so similarly named user methods do not match. Without type services, it reports only a literal array expression and leaves identifiers and calls unreported rather than guessing their iterable type.

Use a counted index loop for array traversal. At 5,000,000 elements, an index loop took 2.607 ms; direct `for...of` took 24.313 ms (9.32×), `.values()` 24.279 ms (9.31×), `.keys()` 24.672 ms (9.46×), and `.entries()` 35.813 ms (13.74×). `for...of` over a non-array iterable such as a `Map` remains outside the rule.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const value of values) {
  total += value;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const [index, value] of values.entries()) {
  total += index + value;
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
for (let index = 0; index < values.length; index += 1) {
  const value = values[index];
  if (value !== undefined) {
    total += value;
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const [key, value] of entries) {
  register(key, value);
}
```
