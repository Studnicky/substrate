---
"@studnicky/retry": major
---

`RetryConfigInterface` (`Retry.create`'s public parameter) references `RetryConfigEntity.InputType` instead of the branded `.Type`, and `RetryConfigEntity`/`BackoffConfigEntity`/`RetryAttemptEventEntity`/`RetrySuccessEventEntity`/`RetryContextDataEntity` gain `InputType`, threaded through `create`'s second type parameter — none previously did, so each entity's own `create()` demanded already-branded input, defeating the point of `create`. `RetryConfigEntity`'s `maximumRetries` field declares `default: 3` in its schema (shared between `Schema` and `Node` via one object, so the default cannot drift between them), so `intake` fills it and `Retry`'s own `maximumRetries`/`maximumElapsedMs` fields stay branded end to end instead of losing the guarantee to a hand-written `?? DEFAULT_MAXIMUM_RETRIES` fallback.

Internally computed values (`stats`, a backoff strategy's computed delay, the retry context built per attempt) earn their brand via a positive `validate()` guard before entering a branded field, rather than being assigned as plain numbers.

`RetryContextInterface`'s `attemptNumber`/`delayMs`/`elapsedMs` reference `RetryContextDataEntity.InputType`, not `.Type` — `onRetryScheduled` overrides are documented to set `context.delayMs` directly from a plain-number backoff computation, so these fields are a subclass-writable surface a subclass could never satisfy with a branded value. The `'retryScheduled'` event Retry itself publishes still earns the brand via `RetryContextDataEntity.create()` from that same context data.
