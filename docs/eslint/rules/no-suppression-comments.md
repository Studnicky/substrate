---
title: '@studnicky/no-suppression-comments'
description: 'Disallows all lint and type suppression comments.'
---

# @studnicky/no-suppression-comments

Disallows all lint and type suppression comments: `eslint-disable`, `eslint-disable-line`, `eslint-disable-next-line`, `eslint-enable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `tslint:disable`, `tslint:disable-line`, and `tslint:disable-next-line`. The auto-fix removes the entire comment line when the line is otherwise whitespace-only.

**Fixable:** Yes (removes the comment line) · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// eslint-disable-next-line no-console
console.log(x);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// @ts-ignore
const y = badlyTyped as string;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
function process(data: any) { /* ... */ }
/* eslint-enable @typescript-eslint/no-explicit-any */
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Fix the underlying type or lint issue instead
function process(data: unknown) { /* ... */ }
```
