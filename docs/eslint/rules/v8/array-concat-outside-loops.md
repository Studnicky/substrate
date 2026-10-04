---
title: '@studnicky/v8/array-concat-outside-loops'
description: 'Disallows built-in Array.concat calls that execute once per iteration.'
---

# @studnicky/v8/array-concat-outside-loops

Disallows `Array.prototype.concat` and `ReadonlyArray.prototype.concat` when the call executes once per iteration. With 200-element chunks, repeatedly assigning `result = result.concat(chunk)` takes 150.3 ms, while `result.push(...chunk)` takes 20.6 ms: 7.3× faster. The rule resolves the called signature, so computed and const-aliased access to the built-in is included while an unrelated method named `concat` is not.

It also reports a named function or a function held in a `const` when every provable call site is per-iteration — a helper's binding must be unshadowed and its every reference a direct call, or the call graph is unprovable and the rule reports nothing. Calls through `.call()` and `.apply()` are outside this rule because `direct-invocation-only` rejects those invocations; `arr.concat.call(...)` also resolves to `Function.prototype.call`, not `Array.prototype.concat`, so the resolved-signature check this rule uses never matches it regardless.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## A per-element callback is a loop body

A callback passed to `.forEach()`, `.map()` or another per-element iteration method counts as a loop body here, so `chunks.forEach((chunk) => { result = result.concat(chunk); })` is reported exactly as the equivalent `for` loop is. The iteration method is identified through its resolved signature rather than its callee name, so an aliased or computed method reference resolves the same way.

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
