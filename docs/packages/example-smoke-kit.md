---
title: '@studnicky/example-smoke-kit'
description: Shared example-smoke scenario entities and test-suite registration for packages/*/tests/smoke.
---

# @studnicky/example-smoke-kit

> Shared example-smoke scenario entities and test-suite registration for `packages/*/tests/smoke`.

## Install

```bash
pnpm add -D @studnicky/example-smoke-kit
```

## Usage

Call `ExampleSmokeRunner.registerExampleSmokeSuite` with a scenario file's parsed contents and a context naming the owning package and the spec file's own URL. It intakes the file through `ExampleScenarioFileEntity`, then registers one `node:test` `it` per case, dispatching each on its `shape`:

<<< ../../packages/example-smoke-kit/examples/basic-usage.ts#usage

A package's real `tests/smoke/examples.loop.spec.ts` loads `examples.scenarios.json` instead of declaring cases inline:

<<< ../../packages/example-smoke-kit/tests/smoke/examples.loop.spec.ts

## Try it

`ExampleSmokeRunner` binds to `node:test`, so the runnable demo exercises the browser-safe half of the package: `ExampleScenarioFileEntity.intake` validates a scenario file and returns the typed cases the runner would register.

<<< ../../packages/example-smoke-kit/examples/scenario-intake.ts#usage

<RunnableExample src="packages/example-smoke-kit/examples/scenario-intake" title="Intake a scenario file and read each case's shape" />

## Scenario shapes

Each case in a scenario file's `cases` array declares a `shape`, validated against one of three entities:

| Shape | Entity | What it asserts |
|---|---|---|
| `imports-example` | `ImportsExampleScenarioEntity` | Dynamically imports `input.file` relative to `context.specUrl` and asserts it does not throw. |
| `browser-example` | `BrowserExampleScenarioEntity` | Asserts `input.file` is registered in that package's `docs/.vitepress/theme/utils/ExampleSourcePaths.json` playground list, without importing it. |
| `worker-entry` | `WorkerEntryScenarioEntity` | Asserts `input.parentFile`'s source references `input.file`'s basename, without importing it. |

`ExampleScenarioEntity` is the `oneOf` union of the three, with `shape` as each branch's discriminant `const`. Every example file under a package's `examples/` directory needs a corresponding scenario entry — `scripts/test-suite.ts`'s orphan check fails the run otherwise, for an example file with no entry or an entry naming a file that does not exist.

## Public API

Import `ExampleSmokeRunner` from `@studnicky/example-smoke-kit/node`. Import `BrowserExampleScenarioEntity`, `ExampleScenarioEntity`, `ExampleScenarioFileEntity`, `ImportsExampleScenarioEntity`, and `WorkerEntryScenarioEntity` from `@studnicky/example-smoke-kit/entities`.

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `BrowserExampleScenarioEntity` | Validates a browser-only scenario case. | `@studnicky/example-smoke-kit/entities` |
| `ExampleScenarioEntity` | `oneOf` union of the three scenario case shapes. | `@studnicky/example-smoke-kit/entities` |
| `ExampleScenarioFileEntity` | Validates a whole `examples.scenarios.json` file's `{ cases: [...] }` envelope. | `@studnicky/example-smoke-kit/entities` |
| `ExampleSmokeRunner` | Registers a `node:test` smoke suite from a scenario file. | `@studnicky/example-smoke-kit/node` |
| `ImportsExampleScenarioEntity` | Validates an imports-and-assert-no-throw scenario case. | `@studnicky/example-smoke-kit/entities` |
| `WorkerEntryScenarioEntity` | Validates a worker-entry-point scenario case. | `@studnicky/example-smoke-kit/entities` |
