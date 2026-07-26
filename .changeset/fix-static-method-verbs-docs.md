---
"@studnicky/eslint-config": patch
---

### Fixed

- `static-method-verbs` documentation describes the rule as it exists: a single `mode` option (`any` | `structural` | `typed`) gating detection, instead of the removed verb-prefix list and `additionalPrefixes`/`ignorePrefixes` options that no longer validate against the rule's schema.
- `hash-private-fields` documentation states that the rule has no comment-based or path-based exemption — an `external-contract` directive comment and an adapters/domain-layer file path do not exempt an underscore-prefixed field.
- `clean-diagnostics` documentation describes the auto-fix for a suppression comment that trails code on the same line, distinct from the whole-line removal for a comment-only line.
- `inline-arrow-functions` documentation lists all eight exempt dispatch-map property keys, including `message`.
- Fixtures for `inline-trivial-logic` (`allowLiterals`, `allowMemberExpressions`), `prefer-collection-types` (`checkArrayLiterals`, `checkFromEntries`, `checkModuleScopeArrays`), `require-options-object` (`minOptionals`), `inline-arrow-functions`, and `inline-functions` now exercise every documented option at a non-default value.
- `LayerResolver` and `TypeContractClassification` scenario fixtures no longer carry inert top-level keys that duplicated the nested `input`/`expected` fields the test runners actually read.
