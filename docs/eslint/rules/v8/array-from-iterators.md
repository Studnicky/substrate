---
title: '@studnicky/v8/array-from-iterators'
description: 'Disallows Array.from on non-array iterators in hot paths.'
---

# @studnicky/v8/array-from-iterators

Disallows `Array.from(iterable)` when the argument is not already an array. Converting iterators (Map, Set, generators) to arrays materializes the full collection in memory — iterate directly instead. When type services are available, the rule uses the TypeScript checker to confirm the argument type.

**Fixable:** No · **Options:** No · **When enabled by `createEslintConfig()`:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// Materializes all Map values into an array unnecessarily
const values = Array.from(map.values());
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Materializes all Set entries into an array
const items = Array.from(new Set(source));
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Iterate directly over the Map values
for (const value of map.values()) {
  process(value);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Spread into array only when the array is truly needed
const snapshot = [...set];
```
