---
title: '@studnicky/hash-private-fields'
description: 'Disallows underscore-prefixed class members; use real #private fields/methods instead.'
---

# @studnicky/hash-private-fields

Disallows underscore-prefixed class members — the `_bar` convention for signalling "private" is a stylistic hint only, not enforced by the language. Use a real `#bar`-style private field or method instead, which the compiler and runtime actually protect. The rule checks `MethodDefinition` and `PropertyDefinition` nodes with a non-computed `Identifier` key starting with `_`; an explicit `private`/`protected` TS accessibility modifier does not exempt an underscore-prefixed name, since the underscore itself is what's banned. Plain TS accessibility modifiers without an underscore, object literal properties (not class members), and computed keys (name cannot be statically proven) are not flagged.

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
// computed key — name cannot be statically proven, not reported
class A {
  ['_bar'] = 1;
}
```
