---
"@studnicky/resilience": patch
---

`CircuitBreakerCallFailedEventEntity` and `CircuitBreakerOnFailureEffectEntity` declare `additionalProperties: false` on `Schema`, matching what `Node`'s closed default already derived into their static `Type`. Runtime validation now rejects an object carrying an extra property alongside `at`/`type` or `variant`, the same shape every sibling circuit-breaker event/effect entity already enforces.
