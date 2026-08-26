---
title: '@studnicky/descriptive-identifiers'
description: 'Disallows configured shorthand tokens in project-owned identifiers.'
---

# @studnicky/descriptive-identifiers

Disallows a configured shorthand token in an identifier. It splits camelCase and PascalCase names into tokens, compares each token case-insensitively, and reports the first match. The banned tokens are `args`, `arr`, `buf`, `cb`, `cfg`, `cnt`, `conf`, `ctx`, `curr`, `dlq`, `doc`, `dst`, `env`, `err`, `fn`, `idx`, `kv`, `len`, `lst`, `max`, `mgr`, `min`, `mq`, `msg`, `num`, `nxt`, `obj`, `opts`, `params`, `prev`, `ptr`, `rcv`, `ref`, `repo`, `ret`, `snd`, `src`, `str`, `svc`, `tmp`, `util`, `utils`, and `val`.

The rule checks declaration IDs, identifier references, enum members, method/property keys, and type parameters. It checks quoted object and class keys only when the quoted value is a valid JavaScript identifier, so project-owned `'ctx'` is in scope while a rule ID, URL, path, or numeric key is not. JSON Schema vocabulary keys are exempt because they are external specification keys. Non-computed member properties and export specifiers are also out of scope.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: conceptual rule example -->
```ts
const cfg = {};
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
function getCtx(): void {}
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
const callbacks = { 'cb': (): void => {} };
void callbacks;
```

## ✓ Correct

<!-- inline-ts-ok: conceptual rule example -->
```ts
const configuration = {};
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
const schema = { 'minLength': 1 };
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
const maximum = Math.max(1, 2);
void maximum;
```
