---
"@studnicky/entity": major
---

Validation diagnostics render from one canonical message table, so the same schema and value produce byte-identical `message` text through `@studnicky/entity/node` and `@studnicky/entity/browser`. The text is substrate's own rather than the backing engine's: Ajv's wording for the keywords it covers, and the same wording on the browser path, which previously surfaced `@cfworker/json-schema`'s prose. Code asserting on `error.message` from the browser entrypoint sees different text than before.

Three defects the browser path carried are fixed. A value outside the JSON Schema data model — `undefined`, a function, a bigint, a symbol — made `@cfworker/json-schema` throw instead of failing validation, so validating an `Error` carrying a `status` crashed the caller rather than classifying it. `NaN` and `Infinity` satisfied `type: 'number'`, which Ajv rejects. `additionalProperties` is evaluated with `for...in` on both engines and therefore walks the prototype chain, while the browser path collected own keys only, so a prototype-inherited property passed a guard the node path enforced.

`not`, `unevaluatedProperties`, `unevaluatedItems`, `oneOf`, `dependentRequired` and the `contains` family now render canonically instead of falling through to the engine's own text. Ajv collapses `contains`, `minContains` and `maxContains` into one diagnostic and reports every declared `dependentRequired` entry rather than the missing ones; both are normalized to that shape on the browser path.
