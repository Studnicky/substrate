---
title: '@studnicky/type-alias-invariants'
description: 'Type aliases preserve schema-derived data identity while interfaces represent contracts and non-schema computations.'
---

# @studnicky/type-alias-invariants

Enforces one ordered contract for type aliases and imported type identity.

A retained alias is verified schema-derived pure data. Callable, constructor, runtime, brand, conditional, mapped, indexed-access, unknown-bearing, and other non-schema computations are interfaces or are redesigned into named schema data plus interface contracts.

**Fixable:** Partial (`noReadonly` explicit syntax only) · **Options:** No · **Suggested severity:** `error`

## Declaration contract

| Declaration | Required representation |
|---|---|
| JSON-Schema-expressible data | `*Entity.Type = FromSchema<typeof Schema>` under the complete entity suite |
| Callable or constructor | Interface call, method, or construct signature |
| Runtime object or provider seam | Interface |
| Readonly access policy | Interface |
| Unique-symbol brand marker | Interface |
| Conditional, mapped, indexed-access, or other non-schema computation | Interface where representable; otherwise named schema data plus a contract interface |

Primitive forwarding aliases, naked renames, generic forwarding aliases, import aliases, inline object aliases, unresolved references, contract-interface references, and non-JSON types do not establish canonical data.

## Direct schema provenance

Import `FromSchema` and `JSONSchema` directly from `json-schema-to-ts` and declare it as a direct dependency. A canonical entity exports `Schema` from an `*Entity` namespace and declares the exact same-namespace relationship `export type Type = FromSchema<typeof Schema>`.

Dependencies are used directly. Packages do not proxy-export `FromSchema`, `JSONSchema`, `ValidateFunction`, or JSON value types.

Provenance resolution follows TypeScript symbols through local declarations and imports with deterministic cycle and depth protection. An unresolved source is non-canonical; matching field shapes do not substitute for verified provenance.

## Diagnostic order

The rule has no subchecks or internal severity settings. ESLint's configured severity is the sole severity.

1. Alias identity reports primitive aliases, naked aliases, generic forwarding aliases, and import aliases.
2. Declaration kind reports callable, constructor, runtime, brand, and non-schema computations as interfaces.
3. Canonical provenance reports data-shaped aliases without verified schema provenance.
4. Exported naming requires retained aliases to end in `Type`.
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
