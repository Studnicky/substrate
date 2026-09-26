---
"@studnicky/flag-evaluator": patch
---

`FlagContextEntity.Schema` declares `'required': []`, matching `Node`'s implicit empty required list. The hand-authored `Schema` previously omitted the key entirely — functionally identical for validation (an empty required list and no key both require nothing), but the literal text disagreed with `Node`.
