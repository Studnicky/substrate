---
"@studnicky/eslint-config": patch
---

`SCHEMA_DERIVING_TYPE_MODULES` no longer recognizes `FromSchema`/`json-schema-to-ts` as valid provenance — `NodeStaticType` and `NodeInputType` from `@studnicky/entity/types` are the only accepted deriving types. `allTypesAreEntities`, `SchemaMemberGuards`, and `TypeContractClassification` now agree with `type-alias-invariants` on this.

`TypeContractInterfaceTypeResolution`'s entity-interface recognition (`export interface Type extends NodeStaticType<typeof Node> {}`) accepts a sibling `Node` const, not only `Schema`, matching `ACCEPTED_SCHEMA_VALUE_NAMES`.

A new `check:no-json-schema-to-ts` script, wired into `pnpm run lint`, fails when a package outside `@studnicky/entity` and `@studnicky/eslint-config` declares a `json-schema-to-ts` dependency.
