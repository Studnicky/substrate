---
title: '@studnicky/hash-private-fields'
description: 'Disallows underscore-prefixed class members; use real #private fields/methods instead.'
---

# @studnicky/hash-private-fields

Disallows underscore-prefixed class members — the `_bar` convention is a stylistic hint, not language-enforced privacy. Use a real `#bar` private field or method instead.

The rule checks class methods and fields whose key is an underscore-prefixed identifier or string literal. It also checks a TypeScript parameter property when it has an accessibility modifier or `readonly`. `private` and `protected` do not exempt an underscore-prefixed name. Object-literal properties and ordinary constructor parameters are outside the rule. A computed identifier such as `[name]` is not statically known, but a literal key such as `['_bar']` is checked.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// underscore-prefixed field
class A {
  _bar = 1;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// underscore-prefixed method
class A {
  _bar(): void {}
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// underscore-prefixed field even with an explicit private modifier
class A {
  private _bar = 1;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// underscore-prefixed getter
class A {
  get _bar(): number { return 1; }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// string-literal keys name the member and are checked
class A {
  ['_bar'] = 1;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// parameter property
class A {
  constructor(private readonly _id: string) {}
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// real private field/method
class A {
  #bar = 1;
  #baz(): void {}
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// TS accessibility modifiers without an underscore — not reported
class A {
  protected bar = 1;
  private baz(): void {}
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// computed identifier — the name is not statically known
class A {
  [getName()] = 1;
}
```
