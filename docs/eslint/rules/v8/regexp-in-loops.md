---
title: '@studnicky/v8/regexp-in-loops'
description: 'Disallows RegExp construction inside loop bodies.'
---

# @studnicky/v8/regexp-in-loops

Disallows `new RegExp(...)` or `RegExp(...)` inside any loop body. Constructing a RegExp object on every iteration allocates a new object and recompiles the pattern. Hoist the regexp to the outer scope and reuse it.

**Fixable:** No · **Options:** No · **When enabled by `createEslintConfig()`:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const line of lines) {
  const re = new RegExp(pattern);
  if (re.test(line)) { results.push(line); }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
for (let i = 0; i < items.length; i++) {
  if (RegExp('^prefix').test(items[i] ?? '')) { match(items[i]); }
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Hoist the RegExp outside the loop
const re = new RegExp(pattern);
for (const line of lines) {
  if (re.test(line)) { results.push(line); }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Regex literals are already compiled at parse time
const PREFIX_RE = /^prefix/;
for (let i = 0; i < items.length; i++) {
  if (PREFIX_RE.test(items[i] ?? '')) { match(items[i]); }
}
```
