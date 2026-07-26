---
"@studnicky/json": patch
---

### Fixed

- The `draft-patch-add` and `draft-patch-roundtrip` scenarios in `json-behavior.scenarios.json` derive their patch by diffing `next` back against `base` and replaying it — a self-consistency check with no independently-stated expected value, so a `Draft.produce` regression that returns `base` unchanged still passes. Each case now also asserts the mutated fields on `next` directly against the scenario's own mutation input.
- The `structural-hash-metadata`, `structural-hash-different`, `merge-isolation`, `merge-hidden-class`, and `data-deepequal-special` scenarios in `json-core.scenarios.json` hardcode their fixtures inline in the spec instead of reading them from the JSON, so editing or corrupting the JSON changes nothing. All five now read their inputs from the scenario data; `merge-hidden-class` asserts the merged key order against the fixture's stated order, and `data-deepequal-special` materializes each pair (array, object, date, regexp, set, map, mixed) from JSON-declared shapes.
- `hash-edge-values` reads its shape labels from the JSON `values` array instead of hardcoding them in the `Hash.value` calls.
- `data-deepequal-true` only compared primitives to themselves, which never exercises `DataType.deepEqual`'s structural comparison paths. It now also asserts distinct-but-deep-equal objects, arrays, and nested structures.
- Removes ~17 dead `assert.equal(expected.<flag>, true)` trailing lines across `json-core.scenarios.json`, `json-behavior.scenarios.json`, and `tests/smoke/examples.scenarios.json` cases that compare a static JSON literal to a hardcoded JS literal after a real assertion already covers the behavior.
