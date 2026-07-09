---
title: '@studnicky/interface-must-be-contract'
description: 'Interfaces express runtime contracts. Pure data shapes — every member JSON-serializable — must be schema-derived type aliases.'
---

# @studnicky/interface-must-be-contract

An `interface` must carry at least one contract signal: a method signature, call signature, construct signature, or a member whose resolved type is a class instance, `Date`, `Map`, `Set`, `Promise`, or another non-serializable type. The rule resolves each member's type through the TypeScript type checker and reports an interface only when **every** member is JSON-serializable. A named-type reference is judged by what it resolves to — a reference to a pure-data type is itself data (so the interface is flagged); a reference to a class instance or a function type is a contract signal (not flagged).

Generic type parameters are treated as serializable placeholders, so `interface Box<T> { v: T }` is a data shape and is flagged. The autofix converts the interface to a `type` alias, preserving the name, `export`/`declare` modifiers, generics, and rewriting `extends` clauses as intersections. The autofix is skipped for declaration-merged or globally-augmented interfaces.

An interface with no members of its own (`interface Foo {}`) is always exempt — there is no shape for a `type` alias to preserve, and an empty interface is the standard idiom for a consumer-declaration-merge target (a library exports it empty so downstream code can `declare module` and merge members in later). This exemption cannot be disabled.

An interface whose only members are index signatures (e.g. `interface Config { [flag: string]: boolean }`) is still flagged, since a plain index-signature shape is usually genuinely just data. If your case is actually a consumer-augmentable extensibility point (declaration merging is only possible for `interface`, never `type`), add it to the `allow` option rather than converting it — the rule cannot distinguish "this really is just a `Record`" from "this is deliberately kept mergeable" through static analysis alone.

**Fixable:** Yes (converts to `type` alias) · **Options:** `allow` (array of interface names to exempt) · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// Pure data shape — every member is JSON-serializable
interface UserRecord {
  id: string;
  name: string;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Index-only shape — no contract signals
interface StringMap {
  [key: string]: string;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Generic type parameter is a serializable placeholder — still a data shape
interface Box<T> {
  value: T;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Named reference that resolves to a pure-data type — still a data shape
type CoordinateType = { x: number; y: number };
interface PointRecord {
  coord: CoordinateType;
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Contract — carries a method signature
interface UserRepositoryInterface {
  find(id: string): Promise<UserRecord>;
  save(user: UserRecord): Promise<void>;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Contract — named reference resolves to a class instance
interface ServiceInterface {
  clock: Clock;
  logger: Logger;
  start(): Promise<void>;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Contract — named reference to a class instance keeps the interface
class EventEmitter { /* … */ }
interface BusInterface {
  emitter: EventEmitter;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Empty — a consumer-declaration-merge target, always exempt
interface PluginRegistryInterface {}
```

## Options

```json
{
  "@studnicky/interface-must-be-contract": ["error", { "allow": ["LegacyShape"] }]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allow` | `string[]` | `[]` | Interface names to exempt from this rule. |
