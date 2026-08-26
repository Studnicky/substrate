---
title: '@studnicky/lexical-this-only'
description: 'Disallows an instance receiver from escaping its method.'
---

# @studnicky/lexical-this-only

Disallows an instance receiver from escaping its method. `this.member` and `return this` are allowed because they preserve the receiver's boundary. Aliasing, assigning, destructuring, storing, and passing an instance receiver to another function are reported.

Static context is different: there `this` is the constructor, so it may be used as a call or construction callee and passed as an argument for subclass-aware construction. The rule also allows an instance constructor to pass itself to one of its enclosing class's nested collaborators: `new EnclosingClass.Nested(this)` and `new EnclosingClass.#Nested(this)`. Passing an instance to any other class or function remains an escape.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

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

<!-- inline-ts-ok: eslint rule example -->
```ts
class Worker {
  public connect(): void {
    register(this);
  }
}
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

<!-- inline-ts-ok: eslint rule example -->
```ts
class Base {
  public static create<T extends Base>(this: new () => T): T {
    return new this();
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
class Owner {
  public attach(): void {
    new Owner.Nested(this);
  }

  public static Nested = class {
    public constructor(owner: Owner) {}
  };
}
```
