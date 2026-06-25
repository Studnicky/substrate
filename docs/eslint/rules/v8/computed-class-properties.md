---
title: '@studnicky/v8/computed-class-properties'
description: 'Disallows computed property keys in class bodies.'
---

# @studnicky/v8/computed-class-properties

Disallows computed property keys in class bodies (`class Foo { [key]() {} }`). Computed keys force a hidden-class transition on every instantiation because V8 cannot statically determine the property layout at parse time.

**Fixable:** No · **Options:** No · **When enabled by `createEslintConfig()`:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
class Foo {
  [Symbol.iterator]() { return this; }
  [Symbol.toPrimitive]() { return 0; }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const key = 'dynamic';
class Bar {
  [key]() { return true; }
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Use string-keyed methods
class Foo {
  toValue() { return 0; }
  iterate() { return this; }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Add well-known symbol methods via a separate Object.assign if needed
class Bar {
  getValue() { return true; }
}
```
