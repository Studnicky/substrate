---
"@studnicky/types": major
---

The package root is the sole code entrypoint for every runtime helper. `JsonValue.is` and `JsonValue.from` use `JSONSchema7Type` from its owner module, `json-schema`; `@types/json-schema` supplies the package's direct declaration dependency. The package exports runtime helpers only: `Empty`, `Guard`, `JsonObject`, `JsonValue`, and `PickDefined`.
