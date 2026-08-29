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

`Merge.deep` uses generic overloads that preserve the caller's value domain: two object inputs return their intersection, same-type inputs retain that type, and mixed inputs return the input union. Runtime merging remains limited to arrays and plain objects; `Date`, `Map`, `Set`, regular expressions, class instances, and other non-plain objects remain atomic values.

## Patch, DataType, and Frozen

Apply RFC-6902 JSON Patch operations by passing one operation or an operation array to `Patch.create(operations)`. Read a deeply isolated snapshot through the patch instance's `operations` projection. `DataType` provides deep structural equality and type guards. `Frozen.deepFreeze` freezes all levels safely, including circular structures:

<<< ../../packages/json/examples/patch-datatype.ts#usage

### Patch contracts and validation

`PatchOperationCoreEntity` is the schema-derived contract for the shared RFC-6902 fields. Its `Schema`, `Type`, and `validate` members define and validate required string `path`, the supported `op` values, and optional string `from`.

`Patch.diff(before, after)` creates a validated RFC-6902 `Patch` between two independently obtained JSON values. It validates both JSON boundaries and uses the same recursive operation emitter as `Draft.producePatch`, without requiring a draft mutation recipe. Read the generated operations through `patch.operations` or apply the patch directly.

`PatchOperationInterface` extends `PatchOperationCoreEntity.Type` with an optional `value: JSONSchema7Type`. `Patch.create` accepts unknown input, rejects fields outside `from`, `op`, `path`, and `value`, and validates the projected core fields through `PatchOperationCoreEntity.validate`. When `value` is present, validation traverses the complete value and rejects nested functions, symbols, bigints, `undefined`, cycles, and other non-JSON values. Variant-specific behavior remains part of patch application rather than the shared core schema.

`JSONSchema7Type` belongs to `json-schema`. Import it directly from `json-schema` when annotating operation values passed to `Patch.create(operations)`; its declarations come from the package's direct `@types/json-schema` dependency. `@studnicky/json` does not export a proxy alias for the dependency-owned type. The patch instance's readonly `operations` property is the public projection of its validated operations and returns deeply isolated values.

The remaining public interfaces describe operation results and path wildcards:

| Interface | Contract |
|-----------|----------|
| `PatchApplyResultInterface` | A `success: boolean`, returned `value: unknown`, and optional `error: string`. |
| `PathWildcardResultInterface` | The `Path.get` wildcard sentinel with `array: unknown[]`, `isWildcard: true`, and `remainingPath: string[]`. |

`DraftNodeStateEntity`, `PatchApplyResultStatusEntity`, and `PathWildcardResultEntity` own the schema-expressible fields composed by these runtime interfaces. Object graphs, maps, and `unknown` values remain interface members because they are not pure-data schema contracts.

## Path, Sort, Hash, and StructuralHash

Convert JSON Pointers to JS access notation, read values via proto-safe dot-paths, sort arrays naturally, and produce deterministic FNV-1a hashes for arbitrary in-memory values. `Hash` encodes `Date`, `Map`, and `Set` values deterministically; `StructuralHash` strips annotation-only keys (`$id`, `title`, `description`) before hashing:

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

### Intake — the trust boundary

`compile` returns a predicate. A predicate narrows a variable in place and produces no value, so nothing a caller holds proves the check happened, and every downstream site re-checks. `compileIntake` returns a **parser**: a function whose return value's type cannot be obtained without having crossed the boundary.

<!-- inline-ts-ok: conceptual usage snippet; no transcludable example file exists for SchemaValidator -->
```ts
export namespace RecordEntity {
  // Schema and Type as above.
  export const validate = SchemaValidator.compile<Type>(Schema);
  export const intake = SchemaValidator.compileIntake<Type>(Schema);
  export const create = SchemaValidator.compileCreate<Type>(Schema);
}

// From outside the process — defaulted, stripped, or rejected. Never coerced: a wrong-typed
// field (a string where the schema declares a number) throws, it is not silently converted.
const record = RecordEntity.intake(await request.json());

// Produced in-process — defaults merged, nothing transformed.
const fixture = RecordEntity.create({ id: 'r-1' });
```

`intake` runs, in order: reject cyclic input, deep-clone so the caller's value is never mutated, then fill schema defaults and strip properties the schema does not declare. It never coerces a scalar's type. Invalid input throws `SchemaIntakeError`, which carries the formatted message, Ajv's raw `errors` array, and the schema's `$id` or `title` so the reader knows which entity rejected the payload.

`create` is for data you produced yourself: defaults are merged, but nothing is stripped, and a wrong-typed value throws exactly as it does in `intake`. The distinction is **provenance, not shape** — running transforms over your own fixture is wrong; skipping them on a request body is worse.

`intake` applies to every entity. `create` is constrained at the type level to object-typed entities, because `Partial<'healthy' | 'degraded'>` is not a usable input.

These run on three separate Ajv instances because Ajv's transform options (`useDefaults`, `removeAdditional`) are configured once per instance, at construction, not per call — there is no per-call toggle. `compile` needs an instance with neither option set, so validating never mutates the value being checked; `compileIntake` needs `useDefaults` and `removeAdditional` on together, to fill defaults and strip undeclared properties; `compileCreate` needs `useDefaults` alone, with no stripping. One instance can only carry one of those three configurations at a time, so serving all three contracts means three instances.

Import schema and validator types from their declaring packages and declare those packages directly: `JSONSchema` and `FromSchema` come from `json-schema-to-ts`, while `ValidateFunction` comes from `ajv`. The schema and `FromSchema` derivation may be split across files; each site imports the owner symbol it uses. `SchemaValidator` supplies `@studnicky/json` runtime functionality, not proxy exports for dependency-owned declarations.

## Public API

Import JSON operations, `SchemaValidator`, `FrozenMutationError`, `JsonError`, `PatchError`, and `SchemaIntakeError` from `@studnicky/json`. Package-owned schemas use `@studnicky/json/entities` and contracts use `@studnicky/json/interfaces`. Dependency-owned schema declarations remain imported directly from `json-schema-to-ts`, `ajv`, and `json-schema`.

## Extending

Most utilities are pure-static; `Patch` is instance-based. Compose the static utilities in a domain-specific class or subclass their protected customization seams. The `merge-clone` example above shows subclassing `Merge` to change array-merge behaviour.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/json)

## Entities

`@studnicky/json/entities` exports every schema namespace in `src/entities`.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
```typescript
import { PatchOperationCoreEntity } from '@studnicky/json/entities';
```

## Interfaces

`@studnicky/json/interfaces` exports every TypeScript interface in `src/interfaces`, including configuration and state contracts.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
```typescript
import type { PatchOperationInterface } from '@studnicky/json/interfaces';
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `Clone` | Provides clone functionality. | `@studnicky/json` |
| `DataType` | Provides data type functionality. | `@studnicky/json` |
| `Draft` | Provides immutable drafting and direct RFC-6902 comparison. | `@studnicky/json` |
| `Frozen` | Provides frozen functionality. | `@studnicky/json` |
| `Hash` | Provides hash functionality. | `@studnicky/json` |
| `Merge` | Provides merge functionality. | `@studnicky/json` |
| `Patch` | Provides patch functionality. | `@studnicky/json` |
| `Path` | Provides path functionality. | `@studnicky/json` |
| `Sort` | Provides sort functionality. | `@studnicky/json` |
| `StructuralHash` | Provides structural hash functionality. | `@studnicky/json` |
| `SchemaValidator` | Provides schema validator functionality. | `@studnicky/json` |
| `FrozenMutationError` | Represents frozen mutation failures. | `@studnicky/json` |
| `JsonError` | Represents json failures. | `@studnicky/json` |
| `PatchError` | Represents patch failures. | `@studnicky/json` |
| `SchemaIntakeError` | Represents schema intake failures. | `@studnicky/json` |
