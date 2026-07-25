---
"@studnicky/eslint-config": major
---

### Added

- `no-mixed-callable-shapes` forbids a type position that mixes a callable constituent with a data constituent. A declaration is callable or it is data, never both, and the diagnostic instructs a split rather than an interface conversion. Detection resolves named references, sees through arbitrary nesting, and treats `undefined`, `null`, and `never` as neutral so an optional callable stays a single shape. An interface counts as callable only when it owns or inherits a call or construct signature, so `Promise<T> | T` and other method-bearing library interfaces are data. The rule joins `entitySuite`.

### Changed

- A generic type alias is a type-level function when its body reaches a conditional, mapped, or indexed-access type through a parenthesized wrapper, a union or intersection member, an array or tuple element, a type-reference argument, or a reference that forwards its own type parameters to another generic type-level function. Such a declaration is exempt from `aliasMustBeInterface`, which no interface declaration can satisfy. A reference supplying concrete type arguments composes a contract portion as before.
- `type-alias-invariants` reports `aliasMustBeInterface` only where an interface can express the shape. A type alias whose body is directly a mixed callable and data union or intersection is reported by `no-mixed-callable-shapes` alone.
- `interfaces-compose-named-types` defers to `no-mixed-callable-shapes` on a mixed member, so a mixed interface member yields one actionable diagnostic instead of two contradictory ones.
- A member keyed by a unique symbol brands its declaration, alongside a member typed `unique symbol`. Both idioms mark a declaration nominally and neither is expressible in JSON, so a brand member is exempt from named-data composition. The exemption reaches brand markers only: every other member on the same declaration still resolves to a schema-derived type, and a computed key that is not a unique symbol composes as ordinary data.
