---
title: '@studnicky/interface-must-be-contract'
description: 'Interfaces express runtime, callable, nominal, and readonly access contracts; pure data is schema-derived.'
---

# @studnicky/interface-must-be-contract

Requires every interface to carry a runtime or access-contract signal.

Pure JSON data belongs in a schema-derived entity type or a named composition of canonical entity types. An interface containing only serializable data is reported, including an empty interface, an index-only interface, and a generic data container.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## Contract signals

An interface is a contract when its own or inherited shape includes at least one of these signals:

- a method or call signature;
- a construct signature;
- a function or constructor member;
- a class-instance or runtime-library type such as `Date`, `Map`, `Set`, or `Promise`;
- a unique-symbol brand marker;
- readonly property, index, array, tuple, or intrinsic readonly policy; or
- a conditional, mapped, indexed-access, `keyof`, or other non-schema contract computation.

Readonly on an interface describes consumer access policy. It is valid even when the referenced value is canonical pure data.

Named references are resolved through the TypeScript checker. A reference to canonical data remains data. A reference to a class, callable contract, readonly contract, or other interface contract supplies a contract signal.

## Incorrect

### Pure-data interface

<!-- inline-ts-ok: eslint rule example -->
```ts
interface UserRecordInterface {
  id: string;
  name: string;
}
```

Define the data in an entity schema:

<!-- inline-ts-ok: eslint rule example -->
```ts
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

export namespace UserEntity {
  export const Schema = {
    properties: {
      id: { type: 'string' },
      name: { type: 'string' }
    },
    required: ['id', 'name'],
    type: 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}
```

### Named pure-data reference without a contract signal

<!-- inline-ts-ok: eslint rule example -->
```ts
interface UserEnvelopeInterface {
  user: UserEntity.Type;
}
```

### Index-only data

<!-- inline-ts-ok: eslint rule example -->
```ts
interface FeatureFlagsInterface {
  [key: string]: boolean;
}
```

### Generic pure data

<!-- inline-ts-ok: eslint rule example -->
```ts
interface BoxInterface<T> {
  value: T;
}
```

### Empty interface

<!-- inline-ts-ok: eslint rule example -->
```ts
interface PluginRegistryInterface {}
```

An empty interface has no runtime or access-contract signal, so it is pure data while this rule is enabled.

## Correct

### Method contract

<!-- inline-ts-ok: eslint rule example -->
```ts
interface UserRepositoryInterface {
  find(id: string): Promise<UserEntity.Type | undefined>;
  save(user: UserEntity.Type): Promise<void>;
}
```

### Readonly access policy

<!-- inline-ts-ok: eslint rule example -->
```ts
interface UserSnapshotInterface {
  readonly value: UserEntity.Type;
}
```

### Callable contract

<!-- inline-ts-ok: eslint rule example -->
```ts
interface UserHandlerInterface {
  (user: UserEntity.Type): Promise<void>;
}
```

`entitySuite` disables `@typescript-eslint/prefer-function-type` so this minimal callable interface receives one consistent verdict. Re-enabling that upstream preference after the suite conflicts with the required interface representation.

### Constructor contract

<!-- inline-ts-ok: eslint rule example -->
```ts
interface ServiceFactoryInterface {
  new (options: ServiceOptionsEntity.Type): Service;
}
```

### Runtime member

<!-- inline-ts-ok: eslint rule example -->
```ts
interface RuntimeStateInterface {
  startedAt: Date;
  stop(): Promise<void>;
}
```

### Brand marker

<!-- inline-ts-ok: eslint rule example -->
```ts
interface UserIdBrandInterface {
  readonly __brand: unique symbol;
}
```

### Inline callable contract object

<!-- inline-ts-ok: eslint rule example -->
```ts
interface DispatcherInterface {
  handler: {
    (event: DomainEventType): Promise<void>;
  };
}
```

The inline object is callable contract structure, not a pure-data portion.

## Remediation

The rule does not convert an interface to a type alias because correct remediation requires a schema and runtime validation boundary. Choose one of these outcomes:

1. define canonical data in an entity namespace with `FromSchema<typeof Schema>`;
2. compose existing canonical entity types in `src/types/`; or
3. keep the interface and express its actual runtime, callable, nominal, or readonly access contract.

Schema, derivation, validation, and dependency-owned JSON types keep direct provenance at their use sites: `JSONSchema` and `FromSchema` come from `json-schema-to-ts`, `ValidateFunction` comes from `ajv`, and `JSONSchema7Type` comes from `json-schema` with declarations supplied by `@types/json-schema`. Each consuming package declares the dependency whose functionality it uses.

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
