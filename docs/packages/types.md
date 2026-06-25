---
title: '@studnicky/types'
description: Shared zero-runtime utility types and type-guard helpers.
---

# @studnicky/types

> Shared zero-runtime utility types and type-guard helpers for `@studnicky/substrate`.

## Install

```bash
pnpm add @studnicky/types
```

## Usage

`Guard` provides type-safe narrowing accessors for wire-format values. `Empty` produces fresh empty collection instances and predicates. Type utilities (`JsonValueType`, `DeepReadonlyType`, `DeepMergeType`) are erased at compile time and carry no runtime cost:

<<< ../../packages/types/examples/guard-accessors.ts#usage

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/types` | All types + `Guard` + `Empty` |
| `@studnicky/types/types` | `JsonValueType`, `JsonObjectType`, `DeepReadonlyType`, `DeepMergeType`, `JsonSchemaType`, `JsonSchemaObjectType`, `JsonSchemaTypeNameType` |
| `@studnicky/types/guards` | `Guard`, `Empty` |

## Extending

`Guard` is a pure-static class. Extend it and `static override isRecord` to customise record detection; `asRecord` and `asRecordArray` delegate through `this.isRecord`, so overrides propagate automatically. The subclass pattern is demonstrated in the usage example above.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/types)
