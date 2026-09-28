---
"@studnicky/throttle": major
---

Every Throttle entity that exports `create` (`AbortResultEntity`, `AbortStartedEventEntity`, `AcquiredEventEntity`, `AdaptiveConfigEntity`, `AdaptiveStatsEntity`, `ConcurrencyAdjustedEventEntity`, `ContendedEventEntity`, `DrainCompletedEventEntity`, `DrainStartedEventEntity`, the `FireOn*EffectEntity` family, `LatencyStatsEntity`, `QueuedEventEntity`, `SlotReleasedEventEntity`, `ThrottleStatsEntity`, `WindowSlidEventEntity`) accepts its `InputType` — a plain, unbranded literal — instead of demanding the branded `minimum`/`exclusiveMinimum`-constrained `Type`, which no caller outside the compiler could construct.
