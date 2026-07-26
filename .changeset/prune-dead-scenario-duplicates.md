---
"@studnicky/retry": patch
"@studnicky/throttle": patch
"@studnicky/eslint-config": patch
---

### Fixed

- `backoff-strategies.scenarios.json` drops the top-level `attempt`/`baseDelay` fields duplicated across 44 cases — `backoff-strategies.loop.spec.ts` reads `scenarioCase.input.attempt`/`.baseDelay` exclusively, so the top-level copies were inert.
- `adaptive-config.scenarios.json` drops the top-level `value` field duplicated on the two `reject-non-positive-target-latency-*` cases — `adaptive-config.loop.spec.ts` never reads `scenarioCase.value`.
- `LayerResolver.scenarios.json` drops the `input.operation` and `input.expect` fields duplicated/orphaned across all 14 cases. `LayerResolver.loop.spec.ts` dispatches on the top-level `operation` discriminator (`operations[scenario.operation]`), so the top-level field is the live one here — the inverse of the other two files — and `input.expect` is read nowhere at all.
