---
title: '@studnicky/v8/arguments-object'
description: 'Disallows the arguments object and requires rest parameters.'
---

# @studnicky/v8/arguments-object

Disallows every use of `arguments` and requires rest parameters. Reading `arguments.length` or an indexed element locally measures the same as rest parameters in Node v24; the costly case is allowing `arguments` to escape its frame, such as by assigning, passing, spreading, returning, or storing it. Measured over 5,000,000 calls to a 2-argument function (3 warm-up calls plus the median of 7 timed calls): rest params took 3.693 ms, a local `arguments.length`/indexed read took 3.478 ms (0.942×, within noise), and `arguments` leaked to an outer binding took 27.687 ms (7.50×). The rule keeps one uniform remedy because rest parameters are never worse and reliably distinguishing every escaping use requires control-flow analysis that a lint rule should not have to get right to be trustworthy.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
function first(): unknown {
  return arguments[0];
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
let saved: IArguments | undefined;
function save(): void {
  saved = arguments;
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
function first(...values: unknown[]): unknown {
  return values[0];
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
let saved: readonly unknown[] | undefined;
function save(...values: unknown[]): void {
  saved = values;
}
```
