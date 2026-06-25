---
title: '@studnicky/v8/define-property'
description: 'Disallows Object.defineProperty.'
---

# @studnicky/v8/define-property

Disallows `Object.defineProperty(...)`. Changing property descriptor flags after object creation forces V8 to transition to a new hidden class or fall back to dictionary mode, invalidating all previously compiled inline caches for that shape.

**Fixable:** No · **Options:** No · **When enabled by `createEslintConfig()`:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
Object.defineProperty(obj, 'id', { value: 1, writable: false });
```

<!-- inline-ts-ok: eslint rule example -->
```ts
Object.defineProperty(proto, 'name', {
  get() { return this._name; },
  enumerable: true
});
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Declare non-writable shapes at construction time via class fields
class Entity {
  readonly id: number;
  constructor(id: number) { this.id = id; }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Use getter methods instead of property descriptors
class Named {
  private _name: string;
  constructor(name: string) { this._name = name; }
  get name(): string { return this._name; }
}
```
