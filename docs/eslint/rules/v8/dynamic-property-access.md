---
title: '@studnicky/v8/dynamic-property-access'
description: 'Reports variable-keyed access on non-indexed receivers when TypeScript can prove it is not collection element access.'
---

# @studnicky/v8/dynamic-property-access

Reports a computed member expression with a variable key when TypeScript type services show that its receiver is not an indexed collection. The rule covers reads and writes. It is aimed at variable string keys on ordinary object shapes, where enough distinct writes force the object from fast properties into dictionary mode and later named-property lookups become hash lookups.

Literal string and numeric keys are exempt: `object['name']` compiles to the same `GetNamedProperty` bytecode and measured identically to `object.name` (17.7 ms each at 50,000,000 iterations). `Symbol.*` keys are also exempt because they are compile-time constants with no dot spelling. Arrays, tuples, typed arrays, `DataView`, and strings are exempt because their indexed elements live in a separate elements store; `array[index]` is the fast path that the related [`for-of-arrays`](./for-of-arrays) rule expects. Without type services, variable keys are not reported rather than guessed.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
const values: { [key: string]: string } = {};
const key = 'name';
values[key] = 'Ada';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const settings = { 'theme': 'dark' };
const key = 'theme';
const value = settings[key];
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const settings = { 'theme': 'dark' };
const value = settings.theme;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const values = new Map<string, string>();
values.set('name', 'Ada');
const value = values.get('name');
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const numbers = [3, 5, 8];
const index = 1;
const value = numbers[index];
```
