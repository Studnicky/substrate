---
title: '@studnicky/v8/with-statement'
description: 'Disallows with statements.'
---

# @studnicky/v8/with-statement

Disallows every `with` statement. A `with` statement changes name resolution for its body at runtime, so the engine cannot rely on the lexical binding for an unqualified name and optimization is impaired. TypeScript strict-mode code also rejects this legacy JavaScript construct.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: conceptual JavaScript construct rejected by TypeScript strict mode -->
```ts
with (Math) {
  const radius = sqrt(pow(x, 2) + pow(y, 2));
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const radius = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const { pow, sqrt } = Math;
const radius = sqrt(pow(x, 2) + pow(y, 2));
```
