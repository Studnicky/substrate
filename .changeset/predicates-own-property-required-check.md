---
"@studnicky/predicates": patch
---

`Predicates.hasAllRequiredProperties` checks own properties only, matching `hasNoAdditionalProperties`, `satisfiesMinProperties`, and `satisfiesMaxProperties`. A `required` key that exists only on the prototype chain (e.g. `constructor`, `toString`) no longer satisfies the check.
