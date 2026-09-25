---
"@studnicky/errors": major
---

`ValidationReportOptionsEntity`'s `status` field declares the same `minimum: 100`/`maximum: 599` range as `ProblemDetailsEntity`'s `status`, and `ValidationErrors.report()` parses its `options` argument through `ValidationReportOptionsEntity.intake()` before building the RFC 9457 payload. A `status` override outside that range throws instead of flowing unchecked into the emitted Problem Details. `report()`'s parameter type is `unknown`; a caller passes untrusted or unvalidated data directly and the boundary validates it.
