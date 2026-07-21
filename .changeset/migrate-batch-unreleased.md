---
"@studnicky/batch": major
---

### Changed

- The package root is the sole public code entrypoint; batching behavior and public entities/errors are imported from `@studnicky/batch`, while batching constants remain implementation details.
- `BatchError.retryable` composes the canonical retryability field from `ErrorClassificationEntity.Type`; consumers import that dependency-owned entity directly from `@studnicky/errors` when they need it.
