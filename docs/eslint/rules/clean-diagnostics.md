---
title: '@studnicky/clean-diagnostics'
description: 'Disallows lint, type, and coverage suppression comments.'
---

# @studnicky/clean-diagnostics

Disallows lint, type, and coverage suppression comments. The rule examines every source comment and reports values matching its suppression pattern, including `eslint-disable`, `eslint-disable-line`, `eslint-disable-next-line`, `eslint-enable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `tslint:disable`, `tslint:disable-line`, `tslint:disable-next-line`, `c8 ignore`, `c8-ignore`, and `istanbul ignore` forms.

This rule reports only. An autofixer that deletes from a suppression comment's start to end-of-line is unsafe for an inline block comment: when the comment shares its line with code — a coverage-suppressing block comment preceding an exported `const` declaration on the same line, for example — the deletion range extends past the comment onto that code. An autofixer that instead removes exactly the comment's own range is equally unsafe: it lets the suppressed diagnostic reappear, which can turn a green tree red at a location unrelated to the edit, and removing a suppression that is load-bearing for a generated or vendored file changes what CI reports rather than what the code means. This rule ships no autofixer for either reason — only a transformation that cannot break the build or change program meaning gets one here, and removing a suppression comment is a decision about which underlying problem to confront, which belongs to a person.

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
