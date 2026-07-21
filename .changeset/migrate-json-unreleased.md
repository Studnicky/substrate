---
"@studnicky/json": major
---

The package root is the sole public code entrypoint for JSON operations, schemas, interfaces, and package-owned errors, including `FrozenMutationError`.

`Patch.create(operations?)` is the sole construction and configuration route. Its `operations` projection is deeply isolated from both constructor input and retained patch state.

`SchemaValidator.compile` exposes the `ValidateFunction` contract owned by `ajv`, while schema declarations and derived types use direct `JSONSchema` and `FromSchema` imports from `json-schema-to-ts`.

Patch value signatures use `JSONSchema7Type` from `json-schema`, backed by the package's direct `@types/json-schema` dependency.

`DraftNodeStateEntity`, `PatchApplyResultStatusEntity`, and `PathWildcardResultEntity` own schema-expressible state and status fields composed by JSON runtime interfaces.
