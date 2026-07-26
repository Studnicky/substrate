---
"@studnicky/fetch": patch
---

### Fixed

- The `docs-graph` browser scenario compares two independent JSON arrays instead of asserting against the browser resolution map. It now reads `package.json`'s `browser` field directly and asserts each entry's source module is importable and free of a direct `undici` import.
- The `auth-username-password`, `auth-username-only`, and `auth-encoded-credentials` URL scenarios route through the native runtime fetch (bypassing the test transport) and assert the actual `TypeError` the runtime raises for a URL carrying userinfo, rather than an unrelated connection-refused error on a non-test port.
- The `destroy-agent-delay` undici dispatcher scenario captures the scheduled timer instead of a wall-clock margin, asserting the configured timeout is what gates the destroy call.
- The `stats-object-after-requests` dispatcher-health scenario issues a real request before reading stats, so it no longer duplicates `empty-stats`.
- The `healthy-non-existent-origin` dispatcher-health scenario reads its `queueRatio`/`recommendation`/`stats` expectations through the same `__UNDEFINED__` sentinel materializer used elsewhere in the suite, so the JSON fixture is no longer decorative.
- The `fast-hook` lifecycle-hooks scenario settles across microtask ticks instead of a real timer, so it can no longer race the hook-timeout enforcement under load.
- The `destroy-zero-no-wait` and `queue-requests-when-pool-is-full` connection-pool scenarios widen their margin and shorten their configured delay respectively, removing a wall-clock race and a five-second-per-run cost while still proving the same contract.
