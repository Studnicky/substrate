---
"@studnicky/retry": major
---

### Changed

- The package root is the sole public code entrypoint for retry behavior, backoff, configuration, errors, entities, validators, and interfaces; algorithm constants remain implementation details.
- Backoff, retry context, retry error options, configuration, and runtime contracts are exported as interfaces. Per-call state is exported as `RetryCallStateEntity.Type`.
- Error classification contracts and `DefaultHttpErrorClassifier` are imported directly from `@studnicky/errors`.
