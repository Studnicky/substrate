---
title: "@studnicky/json"
description: JSON and object utilities for deep merge, clone, freeze, patch, path access, and sort.
---

# @studnicky/json

> JSON/object value-tools: deep merge, clone, immutable snapshots, freeze, path access, sort, patch.

## What it is

A composable JSON and object-value primitive for copying, merging, freezing, patching, accessing, and sorting caller-owned data. It supplies value mechanics and validation contracts without defining a stored document or application model.

## What it is for

Northstar Books uses it to safely compose catalogue configuration, keep immutable inventory snapshots, and represent a change as a portable JSON Patch. Consumers retain ownership of data shapes, persistence, and the policies that authorize a change.

## Northstar Books examples

The runnable merge-and-clone example combines base catalogue settings with a storefront overlay and proves that nested values are detached and arrays follow the selected merge rule. The runnable immutable-snapshot example freezes a stock view, proving that a pricing or availability calculation can retain a stable input while other code continues updating its source record.

## Public entrypoints

| Import path                  | Use it when                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| `@studnicky/json/node`       | A Northstar Books server manipulates JSON or object values for catalogue and inventory work. |
| `@studnicky/json/browser`    | A storefront browser needs the same portable value operations.                               |
| `@studnicky/json/entities`   | An adapter validates schema-expressible patch and path data contracts.                       |
| `@studnicky/json/interfaces` | TypeScript code shares patch, path, configuration, and state contracts.                      |

## Install

```bash
pnpm add @studnicky/json
```

## Runtime imports

Use `@studnicky/json/node` in Node.js and `@studnicky/json/browser` in browser bundles. Both runtime entry points expose the same API. Types, interfaces, and entities use their shared subpaths.

## Merge and Clone

Northstar's storefront team wants to layer a seasonal overlay — holiday pricing, a new tag list — on top of the base catalogue config without hand-writing a merge function or accidentally mutating the original settings object. `Merge.deep` does exactly that: nested objects merge key by key with the overlay winning on conflict, while arrays are swapped out wholesale rather than combined, unless a subclass like `ConcatMerge` below overrides that rule to concatenate instead. `Clone.deep` handles the companion problem — producing an independent copy of a record, dates, maps, and sets included, that shares no references with the original, so editing the clone can never leak back into the source:

<<< ../../packages/json/examples/merge-clone.ts#usage

## Try it

<RunnableExample src="packages/json/examples/merge-clone" title="Deep merge and clone" />

The output shows overlay keys winning on conflict, base keys preserved, arrays replaced atomically by default, and `ConcatMerge` demonstrating the static-override subclass pattern.

`Merge.deep` uses generic overloads that preserve the caller's value domain: two object inputs return their intersection, same-type inputs retain that type, and mixed inputs return the input union. Runtime merging remains limited to arrays and plain objects; `Date`, `Map`, `Set`, regular expressions, class instances, and other non-plain objects remain atomic values.

## Immutable snapshots

A pricing calculation is reading a stock record while, somewhere else in the request, another piece of code is about to update that exact same object — Northstar needs the calculation to see a stable, frozen-in-time view no matter what happens next. `ImmutableSnapshot.from(value)` takes that stock record and hands back a fully detached, deeply frozen copy, built with `structuredClone` and `Frozen.deepFreeze`. Below, the source object's name and role set keep changing after the snapshot is taken, but the snapshot never notices — and trying to mutate its frozen `Map` throws `FrozenMutationError` instead of silently succeeding.

<<< ../../packages/json/examples/immutable-snapshot.ts#usage

<RunnableExample src="packages/json/examples/immutable-snapshot" title="Immutable snapshot" />

## Patch, predicates, and Frozen

Northstar wants to describe "publish this draft" as data — a portable list of edits — instead of writing bespoke mutation code for every workflow that changes a document's status. The example below builds exactly that: a `Patch` that replaces `status`, adds a `publishedAt` date, and removes the now-irrelevant `count` field, then applies it to a working document in one call; a `test` operation shows how a patch can also assert a value and throw `PatchError` when reality doesn't match. Alongside the patch, `Predicates` proves out the structural checks — `areDeeplyEqual`, `isPlainObject`, `isRecord` — a consumer needs before it trusts what it's about to patch, and `Frozen.deepFreeze` locks a nested document tree at every level, including anything circular, so it can't be edited after the fact:

<<< ../../packages/json/examples/patch-predicates.ts#usage

### Patch contracts and validation

`PatchOperationCoreEntity` is the schema-derived contract for the shared RFC-6902 fields. Its `Schema`, `Type`, and `validate` members define and validate required string `path`, the supported `op` values, and optional string `from`.

`Patch.diff(before, after)` creates a validated RFC-6902 `Patch` between two independently obtained JSON values. It validates both JSON boundaries and uses the same recursive operation emitter as `Draft.producePatch`, without requiring a draft mutation recipe. Read the generated operations through `patch.operations` or apply the patch directly.

`PatchOperationInterface` extends `PatchOperationCoreEntity.Type` with an optional `value: JSONSchema7Type`. `Patch.create` accepts unknown input, rejects fields outside `from`, `op`, `path`, and `value`, and validates each operation through `PatchOperationEntity.intake`, the opcode-aware schema that enforces which of `from`/`value` each `op` permits. When `value` is present, validation traverses the complete value and rejects nested functions, symbols, bigints, `undefined`, cycles, and other non-JSON values.

`JSONSchema7Type` belongs to `json-schema`. Import it directly from `json-schema` when annotating operation values passed to `Patch.create(operations)`; its declarations come from the package's direct `@types/json-schema` dependency. `@studnicky/json` does not export a proxy alias for the dependency-owned type. The patch instance's readonly `operations` property is the public projection of its validated operations and returns deeply isolated values.

The remaining public interfaces describe operation results and path wildcards:

| Interface                     | Contract                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `PatchApplyResultInterface`   | A `success: boolean`, returned `value: unknown`, and optional `error: string`.                               |
| `PathWildcardResultInterface` | The `Path.get` wildcard sentinel with `array: unknown[]`, `isWildcard: true`, and `remainingPath: string[]`. |

`DraftNodeStateEntity`, `PatchApplyResultStatusEntity`, and `PathWildcardResultEntity` own the schema-expressible fields composed by these runtime interfaces. Object graphs, maps, and `unknown` values remain interface members because they are not pure-data schema contracts.

## Path and Sort

A JSON Patch operation hands Northstar a pointer like `/items/0/name`, but application code wants to read that value the way JavaScript actually does — `items[0].name`. `Path.toAccess` makes that conversion, and `Path.get` reads a value straight off that dotted path while refusing to touch `__proto__` or `constructor`, so a malicious path string can't climb the prototype chain. `Sort.natural` rounds out the toolkit by sorting strings the way a person would — `file2` before `file10` — rather than lexicographically, with `longestFirst`/`shortestFirst` variants for ordering by length instead. `Hash` and `StructuralHash` publish from [`@studnicky/types`](./types.md).

<<< ../../packages/json/examples/path-sort.ts#usage

## Schema validation

Schema-backed entities use `EntityCompiler` from [`@studnicky/entity`](./entity.md). Import `EntityCompiler` and `SchemaIntakeError` from its `/node` or `/browser` runtime entry point, and import `EntityCreateFunctionInterface`, `EntityIntakeFunctionInterface`, and `EntityValidateFunctionInterface` from `@studnicky/entity/interfaces`. `@studnicky/json` provides JSON value operations; it does not provide schema validation APIs.

## Extending

Most utilities are pure-static; `Patch` is instance-based. Compose the static utilities in a domain-specific class or subclass their protected customization seams. The `merge-clone` example above shows subclassing `Merge` to change array-merge behaviour.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/json)

## Entities

`@studnicky/json/entities` exports every schema namespace in `src/entities`.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->

```typescript
import { PatchOperationCoreEntity } from "@studnicky/json/entities";
```

## Interfaces

`@studnicky/json/interfaces` exports every TypeScript interface in `src/interfaces`, including configuration and state contracts.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->

```typescript
import type { PatchOperationInterface } from "@studnicky/json/interfaces";
```

## Exports

| Symbol                   | Purpose                                                                   | Import path            |
| ------------------------ | ------------------------------------------------------------------------- | ---------------------- |
| `Clone`                  | Provides clone functionality.                                             | `@studnicky/json/node` |
| `Draft`                  | Provides immutable drafting and direct RFC-6902 comparison.               | `@studnicky/json/node` |
| `Frozen`                 | Provides frozen functionality.                                            | `@studnicky/json/node` |
| `ImmutableSnapshot`      | Creates detached deeply frozen snapshots.                                 | `@studnicky/json/node` |
| `Merge`                  | Provides merge functionality.                                             | `@studnicky/json/node` |
| `Patch`                  | Provides patch functionality.                                             | `@studnicky/json/node` |
| `Path`                   | Provides path functionality.                                              | `@studnicky/json/node` |
| `Sort`                   | Provides sort functionality.                                              | `@studnicky/json/node` |
| `CloneError`             | Represents a value that cannot be deep-cloned.                            | `@studnicky/json/node` |
| `FrozenMutationError`    | Represents frozen mutation failures.                                      | `@studnicky/json/node` |
| `ImmutableSnapshotError` | Represents snapshot isolation failures.                                   | `@studnicky/json/node` |
| `JsonError`              | Represents json failures.                                                 | `@studnicky/json/node` |
| `PatchError`             | Represents patch failures.                                                | `@studnicky/json/node` |
| `SameKindError`          | Represents a derived value whose structural kind differs from its source. | `@studnicky/json/node` |
