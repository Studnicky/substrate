---
title: '@studnicky/v8/regexp-in-loops'
description: 'Disallows loop-invariant regular-expression construction in per-iteration positions.'
---

# @studnicky/v8/regexp-in-loops

Disallows `new RegExp(...)`, `RegExp(...)`, and regular-expression literals in a loop or a recognized per-element iteration callback. Constructor calls are reported only when their pattern and flags do not reference a binding declared in the nearest iteration boundary. A pattern that depends on a loop variable, loop-body local, or callback parameter is exempt because it cannot be hoisted without changing its value. A regex literal has no variable inputs and is always reported in a per-iteration position.

For a hoistable pattern on Node v24, testing with a single reused regular expression took 62.39 ms and constructing one per iteration took 202.95 ms over 5,000,000 iterations: 3.25x slower.

The invariance check is a scope-analysis proof, not name matching: it resolves each identifier referenced by the pattern/flags arguments to its declaration and asks whether that declaration sits inside the nearest per-iteration boundary. When a referenced identifier's declaration cannot be resolved at all — a global, an import, an unresolvable scope — that is not treated as proof of loop-variance; only a positively proven loop-scoped reference exempts the construction, so the rule still reports the common case by default.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const line of lines) {
  if (new RegExp('^error:').test(line)) {
    report(line);
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
records.forEach((record) => {
  if (/^ready$/.test(record.state)) {
    publish(record);
  }
});
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const ERROR_PREFIX = new RegExp('^error:');

for (const line of lines) {
  if (ERROR_PREFIX.test(line)) {
    report(line);
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
for (let index = 0; index < patterns.length; index += 1) {
  const pattern = patterns[index] ?? '';
  const matcher = new RegExp(pattern);
  match(matcher);
}
```
