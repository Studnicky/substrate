---
title: '@studnicky/v8/try-catch-in-loops'
description: 'Requires per-iteration error handling to live in a separately named method.'
---

# @studnicky/v8/try-catch-in-loops

Requires `try`/`catch` outside a loop or per-element iteration callback, such as `.forEach`. It also reports a same-file function declaration or variable-bound function expression whose `try`/`catch` is not lexically in a loop but whose every read reference is a direct call from a per-iteration position. A `static` method is a separately named collaborator and is not part of that bounded helper analysis.

This is a structural and testability constraint, not a V8-performance claim. On Node v24, the benchmark measured 3.307 ms without `try`/`catch` and 3.329 ms with it over 5,000,000 iterations: 1.007x, which is noise-level. TurboFan has supported native `try`/`catch` since 2018, so per-iteration `try`/`catch` carries no measurable optimization penalty; the rule instead forces per-iteration error handling into a separately named, independently testable static method.

The helper analysis is deliberately bounded to same-file, direct calls: a helper is flagged only when every read reference to it is a resolvable `name(...)` call and every such call sits in a per-iteration position. A helper passed as a callback value, bound with `.bind()`, re-exported, invoked via `obj.method()`, or called from both inside and outside a loop falls outside this bounded call-graph check and is left unflagged; closing those gaps would require full multi-file call-graph analysis.

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
