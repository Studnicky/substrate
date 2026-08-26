---
title: '@studnicky/v8/conditional-property-assignment'
description: 'Reports conditional this-property establishment that is not proven to give every instance the same property set.'
---

# @studnicky/v8/conditional-property-assignment

Reports conditional establishment of `this` properties in a constructor or a same-class helper called directly by that constructor when the branches are not proven to establish the same property set. It covers `if`/`else`, ternaries, `&&` assignments, `Object.assign(this, condition ? {...} : {...})`, and `switch` statements. It examines direct assignments, including one block level within a branch; computed member writes belong to [`dynamic-property-access`](./dynamic-property-access).

The rule accepts a complete `if`/`else` or ternary when both alternatives assign the same property names. A bare `if`, an `else if` chain, a short-circuit assignment, a conditional `Object.assign` with spreads or computed keys, or different property sets cannot establish that every instance has the same shape and is reported. A `switch` is reported only when its cases establish more than one property name.

The distinction is about divergent maps, not dictionary mode: both branch shapes retain fast properties. Across a two-instance pool and 5,000,000 reads, a same-property branch read took 5.17 ms, while a differing-property branch took 6.75 ms (1.3×).

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
class Connection {
  public constructor(secure: boolean) {
    if (secure) {
      this.protocol = 'https';
    } else {
      this.port = 80;
    }
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
class Connection {
  public constructor(secure: boolean) {
    secure && (this.protocol = 'https');
  }
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
class Connection {
  public protocol: string;

  public constructor(secure: boolean) {
    if (secure) {
      this.protocol = 'https';
    } else {
      this.protocol = 'http';
    }
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
class Connection {
  public protocol: string;

  public constructor(secure: boolean) {
    this.protocol = secure ? 'https' : 'http';
  }
}
```
