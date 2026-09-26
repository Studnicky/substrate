---
"@studnicky/types": major
"@studnicky/errors": patch
---

`@studnicky/types` exports `Empty`, `Hash`, `JsonObject`, `JsonValue`, `Predicate`, `Predicates`, `RuntimeValue` and `StructuralHash`; `PickDefined` is not part of the package. Callers assemble optional fields with conditional spreads, which the compiler checks under `exactOptionalPropertyTypes`. `DomainErrorArgumentList.build` assembles its optional `cause`, `correlationId`, `metadata` and `retryable` fields that way.
