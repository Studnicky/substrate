# `type-alias-invariants` consumer constraints

`type-alias-invariants` accepts a schema-derived data alias when it verifies the derivation structurally: a type-level derivation applied to a value-first schema and resolving to a JSON-plain result. The deriving function can be a generic type alias, declared in a `.d.ts` file, marked with `@schemaDerivation`, or share a package root with the schema builder.

Generic conditional, mapped, and indexed-access alias declarations remain type-level functions. They stay aliases because TypeScript interfaces cannot express those shapes.

The rule does not treat plain hand-authored data aliases as canonical. Consumers using the entity suite also need the repository's `*Entity.Type` namespace convention and separately named pure-data members in interfaces. These requirements are deliberate configuration constraints; enable the corresponding rules only when the consumer adopts that model.

An empty interface used as a declaration-merging target needs contract evidence. An optional unique-symbol brand member supplies that evidence without constraining ordinary consumers:

<!-- inline-ts-ok: consumer-side illustration of the brand-member pattern -->
```ts
export interface ReferencesInterface {
  readonly 'referencesBrand'?: unique symbol;
}
```
