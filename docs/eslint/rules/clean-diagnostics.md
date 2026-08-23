---
title: '@studnicky/clean-diagnostics'
description: 'Disallows lint, type, and coverage suppression comments.'
---

# @studnicky/clean-diagnostics

Disallows lint, type, and coverage suppression comments. The rule examines every source comment and reports values matching its suppression pattern, including `eslint-disable`, `eslint-disable-line`, `eslint-disable-next-line`, `eslint-enable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `tslint:disable`, `tslint:disable-line`, `tslint:disable-next-line`, `c8 ignore`, `c8-ignore`, and `istanbul ignore` forms.

This rule reports only. It has no autofixer: removing a suppression can change diagnostics or remove source when a comment shares a line with code, so the underlying issue requires a deliberate human change.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: conceptual rule example -->
```ts
// eslint-disable-next-line no-console
console.log(value);
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
// @ts-ignore
const value = badlyTyped as string;
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
/* c8 ignore next */
export function hardToReachBranch(): void {}
```

## ✓ Correct

<!-- inline-ts-ok: conceptual rule example -->
```ts
function process(value: unknown): void {
  console.log(value);
}
```
