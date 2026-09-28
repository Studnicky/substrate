---
"@studnicky/resilience": major
---

`DeadLetterQueueOptionsInterface`, `TokenBucketOptionsInterface`, `SlidingWindowLimiterOptionsInterface`, and `DeadLetterQueueRetryGeneratorOptionsInterface` (each a `.create()`'s public parameter) reference their entity's `InputType` instead of the branded `.Type`. `DeadLetterQueueOptionsEntity`, `TokenBucketOptionsEntity`, `SlidingWindowLimiterOptionsEntity`, and `DeadLetterQueueRetryGeneratorOptionsEntity` gain `InputType`, threaded through `create`'s second type parameter — none previously did, so each entity's own `create()` demanded already-branded input.

`DeadLetterQueueRetryGenerator`'s constructor no longer pre-declares its intermediate object with the branded `.Type` annotation before validating it — the annotation asserted a guarantee that only held once options stopped being pre-branded.
