---
title: '@studnicky/no-this-alias'
description: 'Disallows assigning this to a variable or binding it via assignment.'
---

# @studnicky/no-this-alias

Disallows capturing `this` into a local variable (`const self = this`) or via assignment expression. Use arrow functions to preserve lexical `this` instead.

**Fixable:** No · **Options:** No · **When enabled by `createEslintConfig()`:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
const self = this;
setTimeout(function() { self.run(); }, 100);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const that = this;
doAsync(() => { that.complete(); });
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Arrow function preserves lexical this
setTimeout(() => { this.run(); }, 100);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Arrow callback — no alias needed
doAsync(() => { this.complete(); });
```
