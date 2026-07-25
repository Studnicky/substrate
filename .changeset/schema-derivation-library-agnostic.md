---
"@studnicky/eslint-config": major
---

### Changed

- `type-alias-invariants` recognizes schema-derived data by structure rather than by package. The enforced invariant is value-first authoring, a type-level function applied to that value, and a JSON-plain resolved result. TypeBox's `Static`, Zod's `z.infer`, `json-schema-to-ts`'s `FromSchema`, and a project-local equivalent all satisfy `derivedFromSchema` identically.
- A deriving type qualifies when it is a type alias declared with type parameters, is declared in a `.d.ts` file, carries a `/** @schemaDerivation */` JSDoc tag, or shares a package root with the builder that produced the schema value. The JSDoc tag is the one in-code extension point, for a project-local schema-to-type function whose declaration is not itself a generic type alias.
- A schema value is value-first authored when it is a module-scope `const` with no explicit type annotation whose initializer is a const-asserted object literal or a builder call. An explicit annotation or a `let` binding never qualifies, on every recognition path.
- Recognition validates the type a derivation resolves to instead of recursing into the deriving type's implementation. A resolved type carrying call or construct signatures, class instances, symbols, bigints, `never`, `void`, `undefined`, `any`, or `unknown` is not canonical data.
- A type alias with type parameters whose body is a conditional, mapped, or indexed-access type is a type-level function. It is retained as a type alias and is exempt from `aliasMustBeInterface` and `derivedFromSchema`, which no interface declaration can satisfy. Naming, aliasing, and readonly-output checks continue to apply. A reference to a type-level function composes the same contract portion an inline conditional, mapped, or indexed-access body composes; only the declaration is exempt.
- `folder-content-shape` accepts an entity `Type` member that applies any schema-deriving type to `typeof Schema`.
- `type-alias-invariants` and `interface-must-be-contract` take no options. `meta.schema` is `[]` on both, and ESLint's configured severity is the sole severity.
