---
title: '@studnicky/v8/for-in-loops'
description: 'Disallows for...in loops.'
---

# @studnicky/v8/for-in-loops

`for...in` enumerates string keys including inherited ones, triggers deoptimization on objects with non-enumerable or accessor properties, and produces string keys even when integer indexing is expected. Use `Object.keys()`, `Object.values()`, or `Object.entries()` instead.

**Fixable:** No · **Options:** No · **When enabled by `createEslintConfig()`:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const key in obj) {
  process(key, obj[key]);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const key in config) {
  if (Object.prototype.hasOwnProperty.call(config, key)) {
    apply(key, config[key]);
  }
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const [key, value] of Object.entries(obj)) {
  process(key, value);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const key of Object.keys(config)) {
  apply(key, config[key]);
}
```
