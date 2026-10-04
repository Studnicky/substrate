---
title: '@studnicky/v8/for-of-arrays'
description: 'Reports for...of over arrays, tuples, and resolved Array iterator methods; use an index loop.'
---

# @studnicky/v8/for-of-arrays

Reports `for...of` when TypeScript resolves the iterated expression as an array or tuple. With type services it also resolves standard-library `Array` and `ReadonlyArray` calls to `.entries()`, `.values()`, and `.keys()`, so similarly named user methods do not match. Without type services, it reports only a literal array expression and leaves identifiers and calls unreported rather than guessing their iterable type.

Use a counted index loop for array traversal. At 5,000,000 elements, an index loop took 2.607 ms; direct `for...of` took 24.313 ms (9.32×), `.values()` 24.279 ms (9.31×), `.keys()` 24.672 ms (9.46×), and `.entries()` 35.813 ms (13.74×). `for...of` over a non-array iterable such as a `Map` remains outside the rule.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## Why iterator-method calls are resolved by type, not name

A direct array-ness check on the `for...of`'s iterated expression inspects only its static type, and `a.entries()` has type `ArrayIterator<[number, T]>`, not `T[]` — the slowest form measured fully escaped detection under a type-only check. The rule instead resolves `.entries()`/`.values()`/`.keys()` calls through `CallIdentity` against the resolved call signature, matched against `Array`/`ReadonlyArray` declared in the standard library, the same approach `arrayConcatOutsideLoops` uses to resolve `concat`. Resolving by signature rather than callee name means a computed `a['entries']()` spelling or a same-named user method cannot defeat the check the way a name comparison could. This extension requires type services and goes silent without them, the same posture the rest of the rule already has.

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
