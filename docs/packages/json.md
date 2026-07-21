---
title: '@studnicky/json'
description: JSON and object utilities for deep merge, clone, equality, freeze, patch, hash, path access, and sort.
---

# @studnicky/json

> JSON/object value-tools: deep merge, clone, equal, freeze, path access, sort, patch, hash.

## Install

```bash
pnpm add @studnicky/json
```

## Merge and Clone

Deep merge nested objects: overlay wins on conflict, base keys are preserved, and arrays are replaced atomically by default. Clone produces a new object with no shared references, with full Date/Map/Set awareness:

<<< ../../packages/json/examples/merge-clone.ts#usage

## Try it

<RunnableExample src="packages/json/examples/merge-clone" title="Deep merge and clone" />

The output shows overlay keys winning on conflict, base keys preserved, arrays replaced atomically by default, and `ConcatMerge` demonstrating the static-override subclass pattern.

`Merge.deep` exposes return types that match the runtime branches:

- Two plain-object inputs return `Record<string, unknown>`.
- Two array inputs return `readonly unknown[]`.
- Mixed shapes, primitives, and otherwise unknown inputs return `unknown`.

Callers narrow or validate the `unknown` result when the input shapes do not select the object or array overload. The API does not claim a recursively inferred merged type.

## Patch, DataType, and Frozen

Apply RFC-6902 JSON Patch operations by passing one operation or an operation array to `Patch.create(operations)`. Read a deeply isolated snapshot through the patch instance's `operations` projection. `DataType` provides deep structural equality and type guards. `Frozen.deepFreeze` freezes all levels safely, including circular structures:

<<< ../../packages/json/examples/patch-datatype.ts#usage

### Patch contracts and validation

`PatchOperationCoreEntity` is the schema-derived contract for the shared RFC-6902 fields. Its `Schema`, `Type`, and `validate` members define and validate required string `path`, the supported `op` values, and optional string `from`.

`PatchOperationInterface` extends `PatchOperationCoreEntity.Type` with an optional `value: JSONSchema7Type`. `Patch.create` accepts unknown input, rejects fields outside `from`, `op`, `path`, and `value`, and validates the projected core fields through `PatchOperationCoreEntity.validate`. When `value` is present, validation traverses the complete value and rejects nested functions, symbols, bigints, `undefined`, cycles, and other non-JSON values. Variant-specific behavior remains part of patch application rather than the shared core schema.

`JSONSchema7Type` belongs to `json-schema`. Import it directly from `json-schema` when annotating operation values passed to `Patch.create(operations)`; its declarations come from the package's direct `@types/json-schema` dependency. `@studnicky/json` does not export a proxy alias for the dependency-owned type. The patch instance's readonly `operations` property is the public projection of its validated operations and returns deeply isolated values.

The remaining public interfaces describe operation results and path wildcards:

| Interface | Contract |
|-----------|----------|
| `PatchApplyResultInterface` | A `success: boolean`, returned `value: unknown`, and optional `error: string`. |
| `PathWildcardResultInterface` | The `Path.get` wildcard sentinel with `array: unknown[]`, `isWildcard: true`, and `remainingPath: string[]`. |

`DraftNodeStateEntity`, `PatchApplyResultStatusEntity`, and `PathWildcardResultEntity` own the schema-expressible fields composed by these runtime interfaces. Object graphs, maps, and `unknown` values remain interface members because they are not pure-data schema contracts.

## Path, Sort, Hash, and StructuralHash

Convert JSON Pointers to JS access notation, read values via proto-safe dot-paths, sort arrays naturally, and produce deterministic FNV-1a hashes. `StructuralHash` strips annotation-only keys (`$id`, `title`, `description`) before hashing:

<<< ../../packages/json/examples/path-sort-hash.ts#usage

## SchemaValidator

Compile a JSON Schema 2020-12 document into a reusable type-guard predicate, backed by Ajv (`strict: true`, `allErrors: true`, `ajv-formats` registered). Declare a single schema as the source of truth and derive both the compile-time type and the runtime guard from it, so there is no second, hand-written validator to drift out of sync:

<!-- inline-ts-ok: conceptual usage snippet; no transcludable example file exists for SchemaValidator -->
```ts
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace RecordEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      count: { type: 'number' },
      id: { type: 'string' }
    },
    required: ['count', 'id'],
    type: 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  // Compile once at module load and reuse — compilation is the expensive step.
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}

declare const payload: unknown;
if (RecordEntity.validate(payload)) {
  payload.count; // narrowed to RecordEntity.Type
} else {
  // validate.errors carries Ajv's ErrorObject[] after every call
  SchemaValidator.formatErrors(RecordEntity.validate.errors);
  // "(root): must have required property 'count'"
}
```

`SchemaValidator.compile` returns Ajv's `ValidateFunction<TValidated>` directly — it already narrows `unknown` to `TValidated` and exposes `.errors`. `SchemaValidator.formatErrors` renders that array into one human-readable line, falling back to `'invalid payload'` when there are no errors. Override the `protected static formatError` step in a subclass to customise per-error wording.

Import schema and validator types from their declaring packages and declare those packages directly: `JSONSchema` and `FromSchema` come from `json-schema-to-ts`, while `ValidateFunction` comes from `ajv`. The schema and `FromSchema` derivation may be split across files; each site imports the owner symbol it uses. `SchemaValidator` supplies `@studnicky/json` runtime functionality, not proxy exports for dependency-owned declarations.

## Public API

Import JSON operations, `SchemaValidator`, package-owned entities and interfaces, and `FrozenMutationError`, `JsonError`, and `PatchError` from `@studnicky/json`. The package root is the only public code entrypoint. Dependency-owned schema declarations remain imported directly from `json-schema-to-ts`, `ajv`, and `json-schema`.

## Extending

Most utilities are pure-static; `Patch` is instance-based. Compose the static utilities in a domain-specific class or subclass their protected customization seams. The `merge-clone` example above shows subclassing `Merge` to change array-merge behaviour.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/json)
