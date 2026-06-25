---
title: '@studnicky/v8/with-statement'
description: 'Disallows with statements.'
---

# @studnicky/v8/with-statement

Disallows `with` statements. The `with` statement makes scope resolution dynamic — V8 cannot determine at compile time which binding a variable name refers to, so it cannot generate optimized code for the entire surrounding function.

**Fixable:** No · **Options:** No · **When enabled by `createEslintConfig()`:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// @ts-ignore — shown for documentation only; with is not valid in strict mode
with (Math) {
  const r = sqrt(pow(x, 2) + pow(y, 2));
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Use explicit object access
const r = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Or destructure once at the call site
const { sqrt, pow } = Math;
const r = sqrt(pow(x, 2) + pow(y, 2));
```
