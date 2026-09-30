---
"@studnicky/resilience": major
---

`KeyedRateLimiterRegistryOptionsEntity`/`KeyedRateLimiterDefaultOptionsEntity` gain `InputType`, threaded through `create`'s second type parameter — neither previously did. `KeyedRateLimiterStrategyConfigInterface`'s/`KeyedRateLimiterCreateConfigInterface`'s `keyIdleTtlMs`/`maximumKeys` fields reference `KeyedRateLimiterRegistryOptionsEntity.InputType[...]` instead of the branded `.Type[...]`.

The example's and the test's `FixedAllowance`/`FakeFixedAllowance` strategy implementations declared `consume()`/`waitForToken()` returning `RateLimitConsumptionEntity.Type` (branded) when `RateLimiterStrategyInterface` actually returns `RateLimitConsumptionInterface` — a plain, never-externally-validated result computed from live counters. Both now return the interface the contract actually specifies.
