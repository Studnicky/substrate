---
title: '@studnicky/v8/try-catch-in-loops'
description: 'Requires per-iteration error handling to live in a separately named method.'
---

# @studnicky/v8/try-catch-in-loops

Requires `try`/`catch` outside a loop or per-element iteration callback, such as `.forEach`. It also reports a same-file function declaration or variable-bound function expression whose `try`/`catch` is not lexically in a loop but whose every read reference is a direct call from a per-iteration position. A `static` method is a separately named collaborator and is not part of that bounded helper analysis.

This is a structural and testability constraint, not a V8-performance claim. On Node v24, the benchmark measured 3.307 ms without `try`/`catch` and 3.329 ms with it over 5,000,000 iterations: 1.007x, which is noise-level. The helper analysis is deliberately bounded to same-file, direct calls; indirect, multi-file, or mixed-use helpers are not inferred to run only per iteration.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const value of values) {
  try {
    process(value);
  } catch (error) {
    report(error);
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function attempt(value: string): void {
  try {
    process(value);
  } catch (error) {
    report(error);
  }
}

values.forEach(attempt);
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
class Processor {
  public static attempt(value: string): void {
    try {
      process(value);
    } catch (error) {
      report(error);
    }
  }
}

for (const value of values) {
  Processor.attempt(value);
}
```
