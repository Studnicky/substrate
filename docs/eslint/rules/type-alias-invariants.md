---
title: '@studnicky/type-alias-invariants'
description: 'Type aliases preserve schema-derived data identity while interfaces represent contracts and non-schema computations.'
---

# @studnicky/type-alias-invariants

Enforces one ordered contract for type aliases and imported type identity.

A retained alias is verified schema-derived pure data. Callable, constructor, runtime, brand, unknown-bearing, and other non-schema computations are interfaces or are redesigned into named schema data plus interface contracts. A generic conditional, mapped, or indexed-access alias is a type-level function and is retained as a type alias — TypeScript interfaces cannot express these shapes.

**Fixable:** Partial (`noReadonly` explicit syntax only) · **Options:** No · **Suggested severity:** `error`

## Declaration contract

| Declaration | Required representation |
|---|---|
| JSON-Schema-expressible data | `*Entity.Type = F<typeof Schema>` for a verified schema-deriving `F`, under the complete entity suite |
| Callable or constructor | Interface call, method, or construct signature |
| Runtime object or provider seam | Interface |
| Readonly access policy | Interface |
| Unique-symbol brand marker | Interface |
| Generic conditional, mapped, or indexed-access type-level function | Retained as a type alias; interfaces cannot express the shape |
| Non-generic conditional, mapped, indexed-access, or other non-schema computation | Interface where representable; otherwise named schema data plus a contract interface |

Primitive forwarding aliases, naked renames, generic forwarding aliases, import aliases, inline object aliases, unresolved references, contract-interface references, and non-JSON types do not establish canonical data.

A reference to a type-level function from another declaration still composes a contract portion exactly as an inline conditional, mapped, or indexed-access body would — only the type-level function's own declaration is exempt.

## Schema provenance

Recognition is library-agnostic: it inspects what a schema derivation produced, not the package that produced it. A retained alias satisfies four conditions:

1. **Shape** — the alias body applies a type-level function to a value: `F<typeof Schema>`, `typeof Schema.inferred`, or `(typeof Schema)['inferred']`.
2. **Deriving function** — `F` is recognized by structure, not by name or origin package. TypeBox's `Static`, Zod's `z.infer`, `json-schema-to-ts`'s `FromSchema`, and a project-local equivalent are all accepted identically, satisfied by any one of:
   - `F` is a type alias declared with type parameters;
   - `F` is declared in a `.d.ts` file;
   - `F`'s declaration carries a `/** @schemaDerivation */` JSDoc tag — the one in-code extension point, for a project-local schema-to-type function whose declaration is not itself a generic type alias; or
   - `F` and the builder function that produced `Schema` (see below) share the same package root.
3. **Value-first authoring** — `Schema` is a module-scope `const` with no explicit type annotation (an annotation means the type came first, so the value is not the source of truth), whose initializer is either a const-asserted object literal (`{ ... } as const`, optionally `satisfies`-wrapped) or a builder call (`Type.Object(...)`, `z.object(...)`, and so on). A `let` binding never qualifies.
4. **Result plainness** — the *resolved* type that `F<typeof Schema>` produces is JSON-plain: no call or construct signatures, no class instances, no symbol, bigint, `never`, `void`, `undefined`, `any`, or `unknown`. Recognition stops recursing into `F`'s own implementation and checks only what it resolves to, which is what makes this library-agnostic.

Provenance resolution follows TypeScript symbols through local declarations and imports with deterministic cycle and depth protection. An unresolved source is non-canonical; matching field shapes do not substitute for verified provenance.

## Diagnostic order

The rule has no subchecks or internal severity settings. ESLint's configured severity is the sole severity.

1. Alias identity reports primitive aliases, naked aliases, generic forwarding aliases, and import aliases.
2. Declaration shape reports callable, constructor, runtime, brand, and non-schema computations as interfaces. A generic conditional, mapped, or indexed-access alias is classified as a type-level function instead and is exempt from this check and from canonical provenance.
3. Canonical provenance reports data-shaped aliases without verified schema provenance.
4. Exported naming requires retained aliases — including type-level functions — to end in `Type`.
5. Readonly output reports mutable data aliases that author access policy.

An earlier verdict suppresses later advice for the same alias. Structural equality, near-match, and subsumption are not identity evidence: two data types may share a shape while representing different semantics. The rule therefore performs no heuristic imported-shape comparison and does not infer canonical identity from broader or narrower shapes.

The companion [`all-types-are-entities`](./all-types-are-entities.md) rule then requires a retained canonical alias to use the exact entity form.

## Readonly output policy

Pure-data aliases describe mutable data. Readonly access belongs on interface contracts and use sites. The rule detects readonly properties, index signatures, arrays, tuples, mapped output modifiers, `Readonly<T>`, `ReadonlyArray<T>`, exposed readonly defaults, and readonly alias references.

Generic constraints, callable inputs, conditional operands, `keyof` operands, indexed-access operands, mapped keys, and `-readonly` modifiers inspect or constrain data without authoring output policy.

For example, `UserSnapshotInterface` may expose `readonly value: UserEntity.Type` together with a `refresh(): Promise<void>` method. The entity owns the data shape; the interface owns readonly access and runtime behavior.

Pure-data portions inside a contract interface reference separately declared entity types.

## Configuration

The rule takes no options and recognizes no comment, declaration-name, member-name, package, or path exemptions. Enable or disable the complete rule through flat configuration; individual invariant checks cannot be configured independently:

```js
export default [
  {
    files: ['src/**/*.ts'],
    rules: {
      '@studnicky/type-alias-invariants': 'error'
    }
  },
  {
    files: ['generated/**/*.ts'],
    rules: {
      '@studnicky/type-alias-invariants': 'off'
    }
  }
];
```

## Related rules

- [`all-types-are-entities`](./all-types-are-entities.md) requires the exact entity declaration form.
- [`interface-must-be-contract`](./interface-must-be-contract.md) rejects pure-data interfaces.
- [`interfaces-compose-named-types`](./interfaces-compose-named-types.md) extracts pure-data portions from contract interfaces.
- [`no-mixed-callable-shapes`](./no-mixed-callable-shapes.md) owns a union or intersection that mixes a callable constituent with data — a shape `aliasMustBeInterface` cannot direct to an interface, since TypeScript has no syntax for a union-shaped interface.
