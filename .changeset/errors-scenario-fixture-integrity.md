---
"@studnicky/errors": patch
---

### Changed

- `module-error.loop.spec.ts`'s `scenario-defaults` case asserts `ModuleError.create`'s scenario defaults against independent literal expectations in `module-error.scenarios.json` instead of re-deriving them from `ErrorDefaults` — the same table the code under test indexes into. The `scenario-authentication-defaults` and `scenario-not-found-defaults` fixtures now carry their real expected values (`AUTHENTICATION_ERROR`/401/non-retryable and `NOT_FOUND`/404/non-retryable) instead of a copy-pasted `CONNECTION_ERROR`/503/retryable triple.
- `matchers.loop.spec.ts`'s `negative-matcher-route` case reads its boolean expectations from `matchers.scenarios.json` instead of hardcoding every literal, matching the pattern used by its sibling cases. The fixture's `lessThan`, `lte`, and `not` fields are corrected to `true` to match the matchers' actual output for the case's input.
- `CliExitError`'s `defaults-exit-code` case genuinely omits the constructor argument (via an `{"__shape": "undefined"}` input tag) and asserts the resulting `exitCode` is `1`, instead of passing `1` explicitly and testing nothing about the default.
- Removes assertions across `cli-exit-error.loop.spec.ts`, `domain-error-args.loop.spec.ts`, and `examples.loop.spec.ts` that compared two fixture-only values to each other (or a fixture value to a hardcoded literal) without touching the code under test.
