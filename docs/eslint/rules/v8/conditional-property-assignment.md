---
title: '@studnicky/v8/conditional-property-assignment'
description: 'Reports conditional this-property establishment that is not proven to give every instance the same property set.'
---

# @studnicky/v8/conditional-property-assignment

Reports conditional establishment of `this` properties in a constructor or a same-class helper called directly by that constructor when the branches are not proven to establish the same property set. It covers `if`/`else`, ternaries, `&&` assignments, `Object.assign(this, condition ? {...} : {...})`, and `switch` statements. It examines direct assignments, including one block level within a branch; computed member writes belong to [`dynamic-property-access`](./dynamic-property-access). A helper reached only transitively, through another helper rather than called directly from the constructor, is a documented residual limitation and is not covered.

The rule accepts a complete `if`/`else` or ternary when both alternatives assign the same property names. A bare `if`, an `else if` chain, a short-circuit assignment, a conditional `Object.assign` with spreads or computed keys, or different property sets cannot establish that every instance has the same shape and is reported. A `switch` is reported only when its cases establish more than one property name.

The distinction is about divergent maps, not dictionary mode: both branch shapes retain fast properties. Across a two-instance pool and 5,000,000 reads, a same-property branch read took 5.17 ms, while a differing-property branch took 6.75 ms (1.3×). Elsewhere in this hazard class the same divergence measures 1.80×; pool shape and GC pressure at this scale account for the spread between benchmarks — the direction is what is load-bearing.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## Why same-property branching is exempt

Every branch shape stays in `%HasFastProperties`, so this is never a dictionary-mode question — it is whether every branch of a conditional construct is proven to establish the identical set of properties. Verified with `node --allow-natives-syntax`:

<!-- inline-ts-ok: %HaveSameMap proof, run under node --allow-natives-syntax -->
```ts
class SameProperty { constructor(flag) { this.tag = 1; if (flag) { this.value = 1; } else { this.value = 2; } } }
class DifferentProperty { constructor(flag) { this.tag = 1; if (flag) { this.value = 1; } else { this.other = 2; } } }
class MissingElse { constructor(flag) { this.tag = 1; if (flag) { this.value = 1; } } }
class LogicalShortCircuit { constructor(flag) { this.tag = 1; flag && (this.extra = 2); } }
```

| Comparison | `%HaveSameMap` |
| --- | --- |
| `SameProperty(true)` vs `SameProperty(false)` | `true` — no divergence |
| `DifferentProperty(true)` vs `DifferentProperty(false)` | `false` — real hazard |
| `MissingElse(true)` vs `MissingElse(false)` | `false` — real hazard |
| `LogicalShortCircuit(true)` vs `LogicalShortCircuit(false)` | `false` — real hazard |

When every branch assigns only the same property, the two instances end up with the same map and every call site reading them stays monomorphic. When they do not — a different property per branch, a branch that assigns nothing (an `if` with no `else`), or a `&&` short-circuit, which has no "else" to compare against by construction — the instances diverge and any call site reading both goes megamorphic.

## How each branching shape is checked

The rule applies a distinct-property check uniformly across the four branching shapes it recognizes, in addition to `switch`:

- `if`/`else` compares the property-name set assigned in each branch (one `BlockStatement` deep, matching the `switch` handler's granularity). Equal sets are exempt; a bare `if` with no `else`, or an `else if` chain (whose eventual terminal branches this level cannot see without walking further), conservatively flags — proven divergent above for the no-`else` case, and unproven-safe for a chain, which resolves toward the stricter side.
- A ternary (`cond ? (this.a = 1) : (this.b = 2)`) uses the same comparison in expression form: each side must itself be a direct `this.<name> = ...` assignment with the same name.
- A `&&` short-circuit always flags. There is no second branch to compare against; "sometimes assigned, sometimes not" is the missing-else hazard by construction.
- `Object.assign(this, cond ? {...} : {...})` compares the static (non-computed, non-spread) key sets of the two object-literal branches. Either branch containing a spread or a computed key cannot be proven safe from the AST alone, so it flags under the same resolve-toward-stricter posture.

The paired [`define-property`](./define-property) rule's redefinition check reaches the same conclusion — non-uniform establishment diverges instance shape — via `Object.defineProperty` instead of a plain assignment.

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
