---
title: '@studnicky/v8/delete-property'
description: 'Disallows the delete operator on object properties.'
---

# @studnicky/v8/delete-property

`delete obj.prop` permanently transitions the object from fast (hidden-class) mode to dictionary mode. Once in dictionary mode, all subsequent property accesses on that object are slower, including accesses to properties that were never deleted.

**Fixable:** No · **Options:** No · **When enabled by `createEslintConfig()`:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
delete cache[key];
delete user.tempField;
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Set to undefined to preserve the hidden class
cache[key] = undefined;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Use Map.delete() — Map is designed for dynamic key removal
map.delete(key);
```
