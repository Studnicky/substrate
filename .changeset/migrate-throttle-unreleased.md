---
"@studnicky/throttle": major
---

The package root is the sole public code entrypoint for throttle behavior, entities, errors, validators, and `ThrottleInterface`; scheduling constants remain implementation details. The `Throttle` constructor is protected; instances are created via `Throttle.create(config?)`. FSM state is exported as `ThrottleStateEntity.Type`; adaptive, configuration, statistics, and validation data remain schema-backed entity types, while runtime behavior is an interface. Runtime statistics are validated through `ThrottleStatsEntity.validate`.
