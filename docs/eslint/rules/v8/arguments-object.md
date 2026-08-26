---
title: '@studnicky/v8/arguments-object'
description: 'Disallows the arguments object and requires rest parameters.'
---

# @studnicky/v8/arguments-object

Disallows every use of `arguments` and requires rest parameters. Reading `arguments.length` or an indexed element locally measures the same as rest parameters in Node v24; the costly case is allowing `arguments` to escape its frame, such as by assigning, passing, spreading, returning, or storing it. At 5,000,000 calls, an escaped `arguments` object measures 7.5× slower than rest parameters. The rule keeps one uniform remedy because rest parameters are never worse and reliably distinguishing every escaping use requires control-flow analysis.

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
