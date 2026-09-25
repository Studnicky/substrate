---
"@studnicky/scenario-kit": minor
"@studnicky/file-lock": patch
---

New `@studnicky/scenario-kit` package: `ScenarioFileCompiler.compileIntake(caseSchema, caseNode)` validates the `{ cases: [...] }` envelope every `*.scenarios.json` fixture shares against a caller-supplied case entity, replacing a locally declared `type ScenarioCase` plus an `as ScenarioCase[]` cast on the parsed JSON with a real boundary-validated case list. The returned case type is inferred from `caseNode`, never given as an explicit type argument, and `NodeSchemaAgreement.assertMatches` proves `caseSchema` and `caseNode` describe the same shape before compiling, throwing a diagnostic naming both sides on drift. Added as a devDependency, not a runtime dependency, since it exists only for tests.

`packages/file-lock/tests/unit/FileLockConfigError.loop.spec.ts` is converted as the reference example: its case shape is declared once as `FileLockConfigErrorScenarioCaseEntity`, and the spec reads `fileIntake(scenarioGroups).cases` instead of casting the raw JSON.
