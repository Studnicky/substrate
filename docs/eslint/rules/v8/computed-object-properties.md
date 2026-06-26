---
title: '@studnicky/v8/computed-object-properties'
description: 'Disallows computed property keys in object literals.'
---

# @studnicky/v8/computed-object-properties

Disallows computed property keys in object literals (`{ [key]: value }`). Computed keys produce a dictionary-mode object, bypassing V8's hidden-class fast paths. Use a `Map` for dynamic key-value associations or assign properties individually after object creation.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
const obj = { [key]: value };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const config = {
  [Symbol.toStringTag]: 'Config',
  [dynamicKey]: dynamicValue
};
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Use a Map for dynamic key-value associations
const map = new Map<string, string>();
map.set(key, value);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Assign after creation for static shapes
const obj: Record<string, string> = {};
obj[key] = value;
```
