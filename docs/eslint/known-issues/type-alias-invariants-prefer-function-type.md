# `type-alias-invariants`/`folder-content-shape` vs `@typescript-eslint/prefer-function-type` (resolved on the consumer side, no rule change needed)

Found while finishing `json-tology`'s conversion to `@studnicky/eslint-config@9.1.1`. Initially reported as an unresolvable three-rule contradiction; retracted after finding a real fix.

## The original (wrong) claim

A bare callable type — a function signature with no other members — appeared to force a losing choice between:

<!-- inline-ts-ok: consumer-side illustration of the contradiction, not a runnable example -->
```ts
// Form A: type alias — flagged by type-alias-invariants/folder-content-shape
export type LoaderInterface = (iri: string) => Promise<JsonSchemaType | null>;

// Form B: call-signature interface — flagged by prefer-function-type
export interface LoaderInterface {
  (iri: string): Promise<JsonSchemaType | null>;
}
```

`prefer-function-type` fires specifically on an interface whose *only* member is a call signature — that's the exact condition. The fix is to give the interface a second member.

## The actual fix

Add a `unique symbol`-typed brand member (optional, so it never constrains what can be assigned) alongside the call signature:

<!-- inline-ts-ok: consumer-side illustration of the brand-member pattern -->
```ts
export interface LoaderInterface {
  (iri: string): Promise<JsonSchemaType | null>;
  readonly 'loaderBrand'?: unique symbol;
}
```

This is the identical brand-property idiom `@studnicky/interface-must-be-contract` already recognizes as first-class contract evidence (confirmed against `TypeContractClassification.ts` in an earlier pass of this same conversion). Once the interface has two members, `prefer-function-type`'s "only a call signature" precondition no longer holds, so it stops firing — while `type-alias-invariants`/`folder-content-shape` are satisfied because the declaration is genuinely an `interface`. The optional `?` means a plain function value (which structurally lacks the brand property) is still assignable to the interface — confirmed via `tsc --noEmit` across every real call site.

Applied to all 13 files this pattern originally applied to (`AboxLiftFunctionInterface`, `AboxLiftSubjectFunctionInterface`, `ComputedFunctionInterface`, `DispatcherInterface`, `GraphLookupInterface`, `InvariantFunctionInterface`, `LoaderInterface`, `LookupGraphFunctionInterface`, `LookupSchemaFunctionInterface`, `PredicateResolverInterface`, `SchemaRegistryForEachCallbackInterface`, `SkolemizeFunctionInterface`, `ValidateWithErrorsFunctionInterface`) — all now pass all three rules simultaneously with a real code change, no config override.

## Retraction

No rule change needed. This is not a gap in `@studnicky/eslint-config` — it's a case where the correct remedy exists and just wasn't tried before concluding "no fix possible."
