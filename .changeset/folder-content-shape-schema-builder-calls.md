---
"@studnicky/eslint-config": minor
---

### Changed

- `folder-content-shape`'s entity `Schema` check accepts a schema-builder call (e.g. `Type.Object({...})`, `z.object({...})`) alongside the existing `as const` object-literal form, matching `type-alias-invariants`' library-agnostic `derivedFromSchema` recognition.
- `folder-content-shape`'s `missingType`/`typeNotFromSchema` messages describe the deriving-type contract generically (`typeof Schema`) instead of naming `FromSchema` specifically.
- `type-alias-invariants`' `derivedFromSchema` recognition drops its retained `json-schema-to-ts`-specific `FromSchema`/`JSONSchema` fast path — fully subsumed by the general structural recognition (a type alias with type parameters declared in a `.d.ts` file), so `FromSchema` is now judged by the same rule as every other deriving type.

TypeBox and Zod entities (`*Entity.ts` under `entities/`) are now recognized end to end — the semantic classifier and the file-shape rule agree.
