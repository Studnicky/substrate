---
"@studnicky/logger": major
---

The package root is the sole code entrypoint for logger classes, transports, entities, constants, errors, and contracts.

Serializable logger data is exposed through `LogRecordEntity.Type`, `LogBodyDataEntity.Type`, `LogFaultDataEntity.Type`, `LogLevelEntity.Type`, and `LogStatusEntity.Type`.

Entity declarations import `JSONSchema` and `FromSchema` directly from `json-schema-to-ts`, and validator declarations import `ValidateFunction` directly from `ajv`.

Logger, transport, and log-entry construction uses each class's direct `create()` entry point.
