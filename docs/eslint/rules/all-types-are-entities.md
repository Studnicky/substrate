---
title: '@studnicky/all-types-are-entities'
description: "Requires canonical pure-data aliases to use the exact schema-derived '*Entity.Type' form."
---

# @studnicky/all-types-are-entities

Owns the declaration form for aliases already verified as canonical pure data.

The only accepted alias is an exported `Type` member inside an `*Entity` namespace, derived directly from the exported `Schema` value in that same namespace. File paths, package names, test files, arbitrary namespaces, and source comments do not change the result.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## Required form

| Component | Requirement |
|---|---|
| Namespace | An exported name ending in `Entity`, such as `UserEntity` |
| Schema | An exported `Schema` value in that namespace satisfying `JSONSchema` |
| Type | The exact declaration `export type Type = FromSchema<typeof Schema>` in the same namespace |

The rule verifies the syntax and ownership of this relationship:

- the namespace name ends in `Entity`;
- `Type` and `Schema` are exported members of the same namespace; and
- `Type` is exactly `FromSchema<typeof Schema>` with verified schema provenance.

A canonical composition remains JSON-Schema-expressible data, so it belongs in a composed schema rather than a free-standing alias. For example, `export type DomainEventType = UserCreatedEntity.Type | UserDeletedEntity.Type` is invalid.

The example is invalid in every path, including `src/types`, `tests`, configuration packages, and arbitrary namespaces.

## Diagnostic ownership

[`type-alias-invariants`](./type-alias-invariants.md) owns invalid provenance, alias identity, declaration kind, naming, and readonly output. This rule reports only canonical pure-data aliases whose declaration is not the exact entity form, preventing duplicate diagnostics for callable, inline, unresolved, or otherwise invalid aliases.

Classification and ownership checks resolve through TypeScript symbols and verified schema provenance. Unresolved provenance, structural similarity, near matches, and broader or narrower shapes do not establish canonical identity.

## Configuration

The rule takes no options and recognizes no comment, declaration-name, member-name, package, or path exemptions. Enable or disable the complete rule through flat configuration:

```js
export default [
  {
    files: ['src/**/*.ts'],
    rules: {
      '@studnicky/all-types-are-entities': 'error'
    }
  },
  {
    files: ['generated/**/*.ts'],
    rules: {
      '@studnicky/all-types-are-entities': 'off'
    }
  }
];
```

## Related rules

- [`type-alias-invariants`](./type-alias-invariants.md) owns alias identity, declaration kind, canonical source, naming, and readonly output.
- [`interface-must-be-contract`](./interface-must-be-contract.md) rejects interfaces containing only pure data.
- [`interfaces-compose-named-types`](./interfaces-compose-named-types.md) requires named entity references for pure-data portions of contract interfaces.
