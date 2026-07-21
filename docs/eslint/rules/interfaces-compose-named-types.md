---
title: '@studnicky/interfaces-compose-named-types'
description: 'Contract interfaces reference named entities for inline pure-data portions.'
---

# @studnicky/interfaces-compose-named-types

Requires valid contract interfaces to reference named schema-derived entity types for inline pure-data portions.

The rule examines inline object literals and mapped types inside interface properties, index signatures, and return values. It reports an inline portion only when the shared classifier determines that portion is pure data. Inline callable, constructor, runtime, readonly, brand, or other contract objects are legitimate interface structure.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## Rule boundary

The rule runs after interface declaration-kind classification:

1. [`interface-must-be-contract`](./interface-must-be-contract.md) owns an interface that contains only pure data.
2. This rule skips that pure-data interface to avoid a second root diagnostic.
3. This rule inspects a retained contract interface for inline pure-data portions.
4. Each pure-data portion is extracted to a schema-derived entity and referenced through its named `Type`.

Generic type-parameter constraints are inspection roles and remain outside this rule.

## Incorrect

### Inline pure-data property

<!-- inline-ts-ok: eslint rule example -->
```ts
interface SessionInterface {
  readonly state: {
    id: string;
    expiresAt: string;
  };
  refresh(): Promise<void>;
}
```

### Inline pure-data return

<!-- inline-ts-ok: eslint rule example -->
```ts
interface UserReaderInterface {
  read(): {
    id: string;
    name: string;
  };
}
```

### Inline pure-data index value

<!-- inline-ts-ok: eslint rule example -->
```ts
interface RegistryInterface {
  readonly entries: {
    [key: string]: {
      id: string;
      enabled: boolean;
    };
  };
}
```

## Correct

### Named entity reference

<!-- inline-ts-ok: eslint rule example -->
```ts
interface SessionInterface {
  readonly state: SessionStateEntity.Type;
  refresh(): Promise<void>;
}
```

### Named entity return

<!-- inline-ts-ok: eslint rule example -->
```ts
interface UserReaderInterface {
  read(): UserEntity.Type;
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

### Inline runtime contract object

<!-- inline-ts-ok: eslint rule example -->
```ts
interface ProcessInterface {
  runtime: {
    startedAt: Date;
    stop(): Promise<void>;
  };
}
```

### Inline constructor contract object

<!-- inline-ts-ok: eslint rule example -->
```ts
interface FactoryRegistryInterface {
  factory: {
    new (options: ServiceOptionsEntity.Type): Service;
  };
}
```

### Generic constraint

<!-- inline-ts-ok: eslint rule example -->
```ts
interface RepositoryInterface<T extends { id: string }> {
  save(value: T): Promise<void>;
}
```

The inline object constrains `T`; it is not an authored member or return shape.

## Entity extraction

A pure-data portion receives its own schema and named entity type:

<!-- inline-ts-ok: eslint rule example -->
```ts
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

export namespace SessionStateEntity {
  export const Schema = {
    properties: {
      expiresAt: { type: 'string' },
      id: { type: 'string' }
    },
    required: ['expiresAt', 'id'],
    type: 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}
```

The contract interface references `SessionStateEntity.Type`; it does not reproduce the data shape inline.

The schema and type derivation may occupy separate files. Each use site imports its own symbol directly from `json-schema-to-ts`: `JSONSchema` for the schema constraint and `FromSchema` for the derived type. Compiled validators import `ValidateFunction` from `ajv`; public JSON value signatures import `JSONSchema7Type` from `json-schema`, backed by the package's direct `@types/json-schema` declaration dependency.

## Scoped exceptions

Source comments and per-member allow lists do not change classification. Disable the rule only for an explicitly scoped flat-config file set:

```js
export default [
  {
    files: ['src/**/*.ts'],
    rules: {
      '@studnicky/interfaces-compose-named-types': 'error'
    }
  },
  {
    files: ['generated/**/*.ts'],
    rules: {
      '@studnicky/interfaces-compose-named-types': 'off'
    }
  }
];
```

## Related rules

- [`interface-must-be-contract`](./interface-must-be-contract.md) owns pure-data interface declarations.
- [`type-alias-invariants`](./type-alias-invariants.md) verifies canonical alias provenance and declaration kind.
- [`all-types-are-entities`](./all-types-are-entities.md) owns canonical alias placement.
