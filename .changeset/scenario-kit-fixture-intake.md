---
"@studnicky/scenario-kit": minor
"@studnicky/file-lock": patch
---

New `@studnicky/scenario-kit` package: `ScenarioFileCompiler.compileIntake(entity)` validates the `{ cases: [...] }` envelope every `*.scenarios.json` fixture shares against a scenario-case entity namespace (`Schema`, `Node`, and `intake`), replacing a locally declared `type ScenarioCase` plus an `as ScenarioCase[]` cast on the parsed JSON with a real boundary-validated case list. The returned case type is inferred from the entity's `intake`, never given as an explicit type argument, and `NodeSchemaAgreement.assertMatches` proves the entity's `Schema` and `Node` describe the same shape before compiling, throwing a diagnostic naming both sides on drift. A rejected case throws `ScenarioCaseIntakeError` naming its position and `name`. Added as a devDependency, not a runtime dependency, since it exists only for tests.

`packages/file-lock/tests/unit/FileLockConfigError.loop.spec.ts` is the reference example: its case shape is declared once as `FileLockConfigErrorScenarioCaseEntity`, and the spec reads the validated `cases` instead of casting the raw JSON.
