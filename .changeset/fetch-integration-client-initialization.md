---
"@studnicky/fetch": patch
---

### Fixed

- The HTTP-method and JSON-option integration suites hold their shared `FetchClient` as `FetchClient | undefined` and read it through a guard that throws a named error when `before()` has not run. Each previously declared the field as a fully-initialized `FetchClient` via `undefined as unknown as FetchClient`, so a suite-ordering defect surfaced as a bare `TypeError` on a property of `undefined` rather than as a diagnosis.
