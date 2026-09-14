---
title: '@studnicky/json'
description: JSON and object utilities for deep merge, clone, freeze, patch, hash, path access, and sort.
---

# @studnicky/json

> JSON/object value-tools: deep merge, clone, freeze, path access, sort, patch, hash.

## Install

```bash
pnpm add @studnicky/json
```

## Runtime imports

Use `@studnicky/json/node` in Node.js and `@studnicky/json/browser` in browser bundles. Both runtime entry points expose the same API. Types, interfaces, and entities use their shared subpaths.

## Merge and Clone

Deep merge nested objects: overlay wins on conflict, base keys are preserved, and arrays are replaced atomically by default. Clone produces a new object with no shared references, with full Date/Map/Set awareness:

<<< ../../packages/json/examples/merge-clone.ts#usage

## Try it

<RunnableExample src="packages/json/examples/merge-clone" title="Deep merge and clone" />

The output shows overlay keys winning on conflict, base keys preserved, arrays replaced atomically by default, and `ConcatMerge` demonstrating the static-override subclass pattern.

`Merge.deep` uses generic overloads that preserve the caller's value domain: two object inputs return their intersection, same-type inputs retain that type, and mixed inputs return the input union. Runtime merging remains limited to arrays and plain objects; `Date`, `Map`, `Set`, regular expressions, class instances, and other non-plain objects remain atomic values.

## Patch, predicates, and Frozen

Apply RFC-6902 JSON Patch operations by passing one operation or an operation array to `Patch.create(operations)`. Read a deeply isolated snapshot through the patch instance's `operations` projection. Import `Predicates` from `@studnicky/types/node` for deep structural equality, cycle detection, and type guards. `Frozen.deepFreeze` freezes all levels safely, including circular structures; Map and Set references remain mutation-guarded wherever they occur in the object graph:

<<< ../../packages/json/examples/patch-predicates.ts#usage

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

## Schema validation

Schema-backed entities use `EntityCompiler` from [`@studnicky/entity`](./entity.md). Import `EntityCompiler` and `SchemaIntakeError` from its `/node` or `/browser` runtime entry point, and import `EntityCreateFunctionInterface`, `EntityIntakeFunctionInterface`, and `EntityValidateFunctionInterface` from `@studnicky/entity/interfaces`. `@studnicky/json` provides JSON value operations; it does not provide schema validation APIs.

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
| `Clone` | Provides clone functionality. | `@studnicky/json/node` |
| `Draft` | Provides immutable drafting and direct RFC-6902 comparison. | `@studnicky/json/node` |
| `Frozen` | Provides frozen functionality. | `@studnicky/json/node` |
| `Hash` | Provides hash functionality. | `@studnicky/json/node` |
| `Merge` | Provides merge functionality. | `@studnicky/json/node` |
| `Patch` | Provides patch functionality. | `@studnicky/json/node` |
| `Path` | Provides path functionality. | `@studnicky/json/node` |
| `Sort` | Provides sort functionality. | `@studnicky/json/node` |
| `StructuralHash` | Provides structural hash functionality. | `@studnicky/json/node` |
| `FrozenMutationError` | Represents frozen mutation failures. | `@studnicky/json/node` |
| `JsonError` | Represents json failures. | `@studnicky/json/node` |
| `PatchError` | Represents patch failures. | `@studnicky/json/node` |
