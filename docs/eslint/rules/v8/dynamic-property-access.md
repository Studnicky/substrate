---
title: '@studnicky/v8/dynamic-property-access'
description: 'Disallows computed member access inside an object literal.'
---

# @studnicky/v8/dynamic-property-access

A computed (`obj[key]`) member expression used as a value inside an object literal forces V8 to treat the surrounding literal as dictionary-mode rather than assigning it a fast hidden class, because the engine cannot statically determine which property is being read. Read the value into a local first, or restructure the literal so every value is a direct (non-computed) reference.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
const summary = {
  count: stats[key].count,
  label: stats[key].label
};
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const entry = stats[key];
const summary = {
  count: entry.count,
  label: entry.label
};
```
