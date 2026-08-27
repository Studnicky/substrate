---
'@studnicky/eslint-config': patch
---

Recognizes `interface Type extends FromSchema<typeof Schema> {}` as a valid schema-derived
entity shape, not just `type Type = FromSchema<typeof Schema>` — a type alias cannot reference
its own name in its own type arguments, so a self-referential (recursive) schema-derived entity
has no valid alias form. Also recognizes a top-level union of independently-declared,
schema-derived data-contract interfaces as satisfying `type-alias-invariants`, mirroring the
existing callable-mix exemption, for cases where the constituents of a union aren't individually
representable as one interface or one JSON Schema.

Found while folding `@studnicky/drilldown` into the monorepo: its recursive rule-tree type had
no valid canonical form under the prior rule.

The union exemption above initially only required each member to classify as a readonly-evidenced
contract, which an adversarial review found let a union of interfaces with bare, unconstrained
primitive properties and no schema linkage anywhere pass unflagged — no other rule in this family
catches that case for a union member specifically. Each member must now also carry at least one
property or heritage clause that traces back to a real `FromSchema<typeof Schema>` derivation,
directly or through one level of named-type indirection (e.g. `SomeEntity.Type`); a member may
still carry additional free-typed leaf properties alongside that anchor.
