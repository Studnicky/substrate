---
"@studnicky/semantic-matching": patch
---

`VectorIndexInterface.search`'s `options` parameter references `VectorSearchOptionsEntity.InputType` instead of the branded `.Type` — a public method demanding a caller supply already-branded data, which no caller can do. `limit`/`namespace` carry no numeric/string constraint, so `.Type` and `.InputType` are structurally identical for this entity; no caller's behavior changes.
