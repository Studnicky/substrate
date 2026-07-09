---
title: '@studnicky/constants-folder-required'
description: 'Requires files with more than one top-level const declaration to live under a constants/ folder.'
---

# @studnicky/constants-folder-required

Requires that files declaring more than one top-level `const` to live under a `constants/` folder. A file scattering several unrelated top-level constants outside a dedicated location is a sign the values should be grouped under one exported namespace or frozen object literal in `<area>/constants/<Name>.ts`. Declarators named `ajv`, `compiledValidator`, `Schema`, or `validate` are exempt from the count (these are structural, not data constants). Paths under `entities/`, `constants/`, `tests/`, `eslint-config/`, `index.ts`, and `eslint.config.mjs` are exempt entirely.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// two top-level non-exempt consts outside constants/ — flagged once, listing both names
export const TIMEOUT_MS = 1000;
export const MAX_RETRIES = 3;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// three top-level non-exempt consts — flagged once
const A = 1;
const B = 2;
const C = 3;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// mix of exported and non-exported top-level consts — flagged
export const CONFIG = {};
const OTHER = 2;
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// single top-level const — not flagged
export const MAX_RETRIES = 3;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// two consts but one is an exempt structural name (Schema) — only one real const remains
const Schema = {};
export const validate = (): boolean => true;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// file lives under constants/ — exempt regardless of const count
export const ALPHA = 1;
export const BETA = 2;
export const GAMMA = 3;
```
