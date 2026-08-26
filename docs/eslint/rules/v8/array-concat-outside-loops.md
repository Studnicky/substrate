---
title: '@studnicky/v8/array-concat-outside-loops'
description: 'Disallows built-in Array.concat calls that execute once per iteration.'
---

# @studnicky/v8/array-concat-outside-loops

Disallows `Array.prototype.concat` and `ReadonlyArray.prototype.concat` when the call executes once per iteration. With 200-element chunks, repeatedly assigning `result = result.concat(chunk)` takes 150.3 ms, while `result.push(...chunk)` takes 20.6 ms: 7.3× faster. The rule resolves the called signature, so computed and const-aliased access to the built-in is included while an unrelated method named `concat` is not.

It also reports a named function or a function held in a `const` when every provable call site is per-iteration. Calls through `.call()` and `.apply()` are outside this rule because `direct-invocation-only` rejects those invocations.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
let result: string[] = [];
for (const chunk of chunks) {
  result = result.concat(chunk);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
let result: string[] = [];
const append = (chunk: readonly string[]): void => {
  result = result.concat(chunk);
};
for (const chunk of chunks) {
  append(chunk);
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const result: string[] = [];
for (const chunk of chunks) {
  result.push(...chunk);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const merged = chunks.flat();
```
