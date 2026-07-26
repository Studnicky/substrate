# `type-alias-invariants` / `interface-must-be-contract` — re-evaluated against `release/9.0.0` (closed, no open asks)

Follow-up to the earlier v8.0.1 report (same consumer: `json-tology`, upgrading from `@studnicky/eslint-config@7.0.1`). That report is superseded by this one — re-tested directly against a local build of `release/9.0.0`'s `packages/eslint-config` (commit `d51e400`, "recognize schema-derived types by structure"), linked into `json-tology` and run for real, not inferred from source reading alone. Every item below started as a candidate feature request and ended up either retracted (the rule was already correct, `json-tology` misdiagnosed its own conformance debt as a rule gap) or resolved on the consumer side with no rule change. Kept as a record, not an open ask.

## What #64 actually fixed — confirmed real

The structural `derivedFromSchema` recognition (value-first-authored `const` + a deriving type with type parameters, a `.d.ts` declaration, a `@schemaDerivation` tag, or a shared package root) and the `typeFunction` exemption for generic conditional/mapped/indexed-access type-alias **declarations** both work as documented. Traced by hand and confirmed empirically:

- `json-tology`'s `InferType<TSchema, TReferences>` (`src/types/Schema.ts`) is a type alias declared with type parameters, so it now satisfies `isSchemaDerivingFunction`'s fallback path with no `@schemaDerivation` tag needed.
- `CloneOptionsType = InferType<typeof CLONE_OPTIONS_SCHEMA>` (a `const CLONE_OPTIONS_SCHEMA = {...} as const` fed into `InferType`) now resolves through `classifySchemaDerivedApplication` and earns `canonicalRoot: true` — this was the exact repro in the v8.0.1 report and it no longer fails `derivedFromSchema`/`aliasMustBeInterface`.
- `InferType`'s own declaration (a nested conditional-type composition) is now classified `typeFunction` rather than `interfaceContract`, so it no longer gets told to "declare the contract as an interface" — a remedy TypeScript has no syntax for. This resolves the whole `InferType`/`InferSchemaType` cascade that was the single largest driver of `json-tology`'s original 565 `aliasMustBeInterface` violations.

Real, measured effect: linking a local build of `release/9.0.0` into `json-tology` (same working tree, only the plugin swapped) drops `@studnicky/type-alias-invariants` violations from 609 (v8.0.1) to 479. That's the #64 fix working, not a wash — genuine credit where due.

## Status

### 1. Not a gap — retracted

An earlier draft asked for `OPTIONS_SCHEMA` to be restored so `noReadonly`/etc. could be scoped off per-file, reading the `[8.0.1]` CHANGELOG's "five independently toggleable checks" line as an unfulfilled promise. Corrected: these rules are intentionally non-configurable — strict by design, not an oversight. The 48 `noReadonly` violations this surfaces in `json-tology` are its own debt (drop `readonly` from the affected exported data types; consumers declare immutability at the use site, per the rule's own message) — no upstream ask.

### 2. `interface-must-be-contract`'s declaration-merging case — resolved on the consumer side, no rule change needed

`json-tology/src/interfaces/JsonTologyReferencesInterface.ts` was a deliberately empty interface — a consumer-augmentable declaration-merge target (TypeScript module augmentation requires `interface`, not `type`). It failed `interface-must-be-contract` under `release/9.0.0`. Resolved without any upstream change: added a `unique symbol`-typed brand member —

<!-- inline-ts-ok: consumer-side illustration of the brand-member pattern -->
```ts
export interface JsonTologyReferencesInterface {
  readonly 'jsonTologyBrand'?: unique symbol;
}
```

— which the rule already recognizes (`findInterfaceContract`, `TypeContractClassification.ts:924-926`: a property signature typed `unique symbol` returns `reason: 'brand'`, and `'brand'` is in `interfaceContractReason`). Confirmed this doesn't undermine the actual extension mechanism: the real lookup site (`TReference extends keyof TReferences` in `json-tology/src/types/Infer.ts`) checks one exact literal string against the key union, so one additional named brand key changes nothing about how any other `$ref` string resolves — verified both by reading the call site and by a standalone `tsc --strict` compile of the merge + lookup pattern. Full `type-check:all`, lint, and the 3543-test suite all pass with this change in `json-tology`. No rule change requested here — this was a case where the rule's existing `brand` recognition already covered a consumer-augmentable-interface pattern the earlier draft of this report assumed had no solution.

### 3. Not a gap — retracted

An earlier draft of this report asked for an escape hatch letting `derivedFromSchema`/`aliasMustBeInterface` accept plain, non-schema-derived data (citing `AnnotatedEdgeDescriptorType`, `AnnotationAccumulatorType`, and ~381 similar violations as an intentional category). That was wrong and is retracted: `json-tology`'s actual position is that these types *should* trace to an authored JSON Schema — the rule's stance is correct, and the remaining ~430 violations (381 `aliasMustBeInterface` + 50 `derivedFromSchema`) are `json-tology`'s own debt to pay down by converting hand-typed internal shapes into real `as const` schema literals + `InferType<typeof X>`, not something to request an exemption for. No ask here.

### 4. New in this release: `all-types-are-entities` and `interfaces-compose-named-types` assume every consumer follows the substrate repo's own `*Entity`-namespace convention

Both are new rules exercised for the first time in this evaluation (46 + 9 = 55 violations on `json-tology`). `all-types-are-entities` requires every canonical pure-data type alias to be the exported `Type` member of an `*Entity` namespace deriving from that entity's own JSON Schema — e.g. it now blocks `CloneOptionsType` (the exact type #64 just taught `derivedFromSchema` to accept!) with *"must be the exported 'Type' member of an '*Entity' namespace and derive directly from that entity's JSON Schema."* `interfaces-compose-named-types` similarly requires every inline-typed interface member (`isEmpty: boolean`, `count: number`) to be extracted into its own named schema-derived entity and referenced by name.

Not a gap, retracted: these rules are deliberate — they exist specifically to enforce consumer adoption of the Entity system, not to describe `noocodec-substrate`'s own internal convention incidentally leaking into the base rule set. `json-tology` adopting them means restructuring its own `src/types/` population into the `FooEntity` namespace pattern, which is additional scope on top of item 3's schema-derivation debt, not an upstream ask.

## Scope note

Filtered by hand: of the 479 remaining `type-alias-invariants` violations under `release/9.0.0`, 48 are the `noReadonly` regression (item 1 — `json-tology`'s own fix, drop `readonly` from the affected types) and the remaining ~431 (50 `derivedFromSchema` + ~381 `aliasMustBeInterface`) plus the 55 `all-types-are-entities`/`interfaces-compose-named-types` violations are `json-tology`'s own Entity-system adoption debt (items 3–4, in progress on the consumer side). Item 2 (`interface-must-be-contract` vs. a deliberately empty declaration-merge target) is resolved via the `unique symbol` brand pattern above. Nothing in this report is an open ask against `@studnicky/eslint-config` as of `release/9.0.0`.
