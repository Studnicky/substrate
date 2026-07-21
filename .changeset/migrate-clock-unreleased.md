---
"@studnicky/clock": major
---

### Changed

- The package root is the sole public code entrypoint, including `ClockProviderInterface` and all clock implementations and option entities.
- `Clock`, `RealTimeClockProvider`, `VirtualClockProvider`, and `VirtualTimeCounter` have protected constructors. Instances use `Class.create(...)`, with validation consolidated in the constructor.
- `RealTimeClockProvider` construction normalizes to an options object: `RealTimeClockProvider.create({ offsetMs })`.
- `VirtualTimeCounter.create({ startMs })` accepts finite, non-negative time and throws `ClockError` for invalid values.
- `VirtualClockProvider.create(counter)` is the construction path.
- `Clock.create(provider)` is the construction path.

### Added

- `RealTimeClockProviderOptionsEntity`, `VirtualTimeCounterOptionsEntity` — schema-validated option types for plain-data configuration.
