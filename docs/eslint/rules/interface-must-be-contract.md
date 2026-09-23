---
title: '@studnicky/interface-must-be-contract'
description: 'Interfaces express runtime, callable, nominal, and readonly access contracts; pure data is schema-derived.'
---

# @studnicky/interface-must-be-contract

Requires every non-canonical interface to carry a runtime or access-contract signal. The rule requires TypeScript parser services; when they are unavailable, it does not report.

Pure JSON data belongs in a schema-derived entity type or a named composition of canonical entity types. An interface containing only serializable data is reported, including an empty interface, an index-only interface, and a generic data container. The canonical schema-derived entity-interface form is exempt: an exported interface named `Type`, with exactly one schema-derived `extends` type, in an `*Entity` namespace that exports its own `Schema`.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## Contract signals

An interface is a contract when its own or inherited shape includes at least one of these signals:

- a method or call signature (except a zero-argument `toString` or `valueOf` decoy);
- a construct signature;
- a function or constructor member;
- a class-instance or runtime-library type such as `Date`, `Map`, `Set`, or `Promise`;
- a unique-symbol brand marker;
- readonly property, index, array, tuple, or intrinsic readonly policy; or
- a conditional, mapped, indexed-access, `keyof`, or other non-schema contract computation.

Readonly on an interface describes consumer access policy. A lone readonly member does not establish a contract when the interface also has three or more mutable pure-data members; make the access policy comprehensive or use a runtime, callable, nominal, or type-level contract signal instead.

Named references are resolved through the TypeScript checker. A reference to canonical data remains data. A reference to a class, callable contract, readonly contract, or other interface contract supplies a contract signal.

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
interface FeatureFlagsInterface {
  [key: string]: boolean;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
interface BoxInterface<T> {
  value: T;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
type UserIdType = string;

interface UserEnvelopeInterface {
  user: UserIdType;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
interface RecordInterface {
  toString(): string;
  value: string;
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
interface RunnerInterface {
  run(): void;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
interface RecordInterface {
  readonly id: string;
  value: string;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
interface RecordInterface {
  readonly a: string;
  readonly b: number;
  readonly c: boolean;
  readonly d: boolean;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
interface RecordInterface {
  toString(radix: number): string;
  a: string;
  b: number;
  c: boolean;
}
```

## Remediation

The rule does not convert an interface to a type alias because correct remediation requires a schema and runtime validation boundary. Choose one of these outcomes:

1. define canonical data in an entity namespace with a schema-derived `Type`, such as `FromSchema<typeof Schema>`;
2. compose existing canonical entity types in `src/types/`; or
3. keep the interface and express its actual runtime, callable, nominal, or readonly access contract.

Schema derivation is recognized structurally, not by package: `FromSchema` from `json-schema-to-ts`, TypeBox's `Static`, Zod's `z.infer`, and a project-local equivalent are all valid. Validation and other dependency-owned JSON types keep direct provenance at their use sites: `ValidateFunction` comes from `ajv`, and `JSONSchema7Type` comes from `json-schema` with declarations supplied by `@types/json-schema`. Each consuming package declares the dependency whose functionality it uses.

## Scoped exceptions

The rule has no per-interface name allow list. Source comments do not change classification. Disable the rule only for an explicitly scoped flat-config file set:

```js
export default [
  {
    files: ['src/**/*.ts'],
    rules: {
      '@studnicky/interface-must-be-contract': 'error'
    }
  },
  {
    files: ['src/module-augmentation/**/*.ts'],
    rules: {
      '@studnicky/interface-must-be-contract': 'off'
    }
  }
];
```

## Related rules

- [`type-alias-invariants`](./type-alias-invariants.md) directs non-schema aliases to interfaces or redesign.
- [`interfaces-compose-named-types`](./interfaces-compose-named-types.md) extracts inline pure-data portions from valid contract interfaces.
- [`all-types-are-entities`](./all-types-are-entities.md) owns canonical alias placement.
