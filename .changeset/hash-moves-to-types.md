---
"@studnicky/json": major
"@studnicky/types": minor
---

`Hash` and `StructuralHash` move from `@studnicky/json` to `@studnicky/types`. `StructuralHash` strips `$id`, `description`, and `title` before hashing a JSON schema document, which is schema-cache behaviour that belongs beside the other object utilities in `@studnicky/types` — `@studnicky/json` depends on `@studnicky/entity`, so the schema engine could never import the utility from there. Import both from `@studnicky/types` going forward.
