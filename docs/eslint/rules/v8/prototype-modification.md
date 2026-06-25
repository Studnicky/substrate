---
title: '@studnicky/v8/prototype-modification'
description: 'Disallows assigning to .prototype after class definition.'
---

# @studnicky/v8/prototype-modification

Disallows assigning to `.prototype` (e.g. `Foo.prototype.bar = ...`). Mutating the prototype after construction invalidates every existing instance's hidden class and prevents inline-cache hits for any code that has already seen the type.

**Fixable:** No · **Options:** No · **When enabled by `createEslintConfig()`:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
MyClass.prototype.newMethod = function() { /* ... */ };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
Array.prototype.last = function() { return this[this.length - 1]; };
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Declare all methods in the class body
class MyClass {
  newMethod() { /* ... */ }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Use a utility function instead of extending built-ins
function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}
```
