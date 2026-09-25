---
"@studnicky/visible-range": major
---

`VisibleRange.create` takes `(config: unknown, collaborators: VisibleRangeCollaboratorsInterface = {})` instead of a single pre-typed options object. `count`/`itemSize`/`overscan` go through `VisibleRangeConfigDataEntity.intake`, which now actually runs — the constructor previously took the schema's own `InputType` pre-typed and only hand-checked `itemSize > 0`, leaving `count` and `overscan` completely unvalidated despite the schema declaring real constraints for both. `estimateSize` is a typed collaborator. The `itemSize`/`estimateSize` mutual-exclusivity check stays — a cross-field XOR invariant no schema expresses. `VisibleRangeConfigInterface` is replaced by `VisibleRangeCollaboratorsInterface`, which carries only `estimateSize`.
