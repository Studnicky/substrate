---
"@studnicky/flag-evaluator": major
---

### Changed

- `FlagDefinitionEntity.Type` is the schema-derived flag definition. `FlagContextEntity` owns the optional schema-expressible targeting key, while `FlagContextInterface` composes that field into an open evaluation-context contract.
