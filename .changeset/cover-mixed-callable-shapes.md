---
"@studnicky/eslint-config": patch
---

### Changed

- `no-mixed-callable-shapes` gains a fixture set covering every documented union/intersection mix (callable, constructor, named callable reference, callable interface reference, and a mixed member nested inside a property), the purely-callable and purely-data non-mixes, and the `Promise<T> | T` and `Map<K, V> | V` method-bearing library interface carve-outs.
- `interface-must-be-contract` gains `invalid` fixtures for index-only data, generic pure data, and a named pure-data reference with no contract signal.
- `interfaces-compose-named-types` gains `invalid` fixtures for an inline pure-data return value, an inline pure-data index value, and the brand-member exemption's narrowness — a computed unique-symbol key and a `unique symbol` value type each exempt only the brand member itself, while an ordinary sibling member still requires named-data composition. A locked-in regression test confirms a member mixing a callable constituent with data yields the `no-mixed-callable-shapes` diagnostic alone.
