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

## Patch, DataType, and Frozen

Apply RFC-6902 JSON Patch operations using either the constructor or static factory methods. `DataType` provides deep structural equality and type guards. `Frozen.deepFreeze` freezes all levels safely, including circular structures:

<<< ../../packages/json/examples/patch-datatype.ts#usage

## Path, Sort, Hash, and StructuralHash

Convert JSON Pointers to JS access notation, read values via proto-safe dot-paths, sort arrays naturally, and produce deterministic FNV-1a hashes. `StructuralHash` strips annotation-only keys (`$id`, `title`, `description`) before hashing:

<<< ../../packages/json/examples/path-sort-hash.ts#usage

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/json` | `Clone`, `DataType`, `Frozen`, `Hash`, `Merge`, `Patch`, `Path`, `Sort`, `StructuralHash`, `PatchError` |
| `@studnicky/json/json` | All utility classes |
| `@studnicky/json/types` | `DeepMergeType`, `PatchApplyResultType`, `PatchOperationType`, `PatchOpVariantType` |
| `@studnicky/json/errors` | `PatchError` |
| `@studnicky/json/interfaces` | `PathWildcardResultType` |

## Extending

Since the utilities are pure-static, compose them by wrapping in a domain-specific static class. The `merge-clone` example above shows subclassing `Merge` to change array-merge behaviour.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/json)
