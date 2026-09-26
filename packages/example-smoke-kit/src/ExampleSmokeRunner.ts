import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import type { ExampleScenarioEntity } from './entities/ExampleScenarioEntity.js';
import type { ExampleSmokeContextInterface } from './interfaces/ExampleSmokeContextInterface.js';
import type { ShapeRunnerFunctionInterface } from './interfaces/ShapeRunnerFunctionInterface.js';

import { EXAMPLE_SMOKE_CONSTANTS } from './constants/ExampleSmokeConstants.js';
import { DocsPlaygroundPathsEntity } from './entities/DocsPlaygroundPathsEntity.js';
import { ExampleScenarioFileEntity } from './entities/ExampleScenarioFileEntity.js';

/** Registers a `describe`/`it` suite from a package's `examples.scenarios.json`, dispatching each case by its `shape`. */
export class ExampleSmokeRunner {
  static async runImportsExample(scenario: ExampleScenarioEntity.Type, context: ExampleSmokeContextInterface): Promise<void> {
    if (scenario.shape === 'imports-example') {
      await assert.doesNotReject(async () => {
        await import(new URL(scenario.input.file, context.specUrl).href);
      }, `Example ${scenario.name} threw`);
    }
  }

  static runBrowserExample(scenario: ExampleScenarioEntity.Type, context: ExampleSmokeContextInterface): void {
    if (scenario.shape === 'browser-example') {
      const playgroundPaths = DocsPlaygroundPathsEntity.intake(
        JSON.parse(readFileSync(fileURLToPath(new URL(EXAMPLE_SMOKE_CONSTANTS.DOCS_PLAYGROUND_PATHS_RELATIVE_URL, context.specUrl)), 'utf8'))
      );
      const exampleName = scenario.input.file
        .replace(EXAMPLE_SMOKE_CONSTANTS.FILE_BASENAME_PATTERN, '')
        .replace(EXAMPLE_SMOKE_CONSTANTS.TS_EXTENSION_PATTERN, '');
      const docsPlaygroundKey = `packages/${context.packageName}/examples/${exampleName}`;
      assert.ok(
        playgroundPaths.includes(docsPlaygroundKey),
        `Browser-only example ${scenario.name} must be registered as ${docsPlaygroundKey} in ExampleSourcePaths.json`
      );
    }
  }

  static runWorkerEntry(scenario: ExampleScenarioEntity.Type, context: ExampleSmokeContextInterface): void {
    if (scenario.shape === 'worker-entry') {
      const parentSource = readFileSync(fileURLToPath(new URL(scenario.input.parentFile, context.specUrl)), 'utf8');
      const workerFileName = scenario.input.file.replace(EXAMPLE_SMOKE_CONSTANTS.FILE_BASENAME_PATTERN, '');
      assert.ok(
        parentSource.includes(workerFileName),
        `Worker entry ${scenario.name} must be referenced by ${scenario.input.parentFile}`
      );
    }
  }

  static readonly #shapeRunners = new Map<ExampleScenarioEntity.Type['shape'], ShapeRunnerFunctionInterface>([
    ['browser-example', ExampleSmokeRunner.runBrowserExample],
    ['imports-example', ExampleSmokeRunner.runImportsExample],
    ['worker-entry', ExampleSmokeRunner.runWorkerEntry]
  ]);

  static async runScenario(scenario: ExampleScenarioEntity.Type, context: ExampleSmokeContextInterface): Promise<void> {
    const runner = ExampleSmokeRunner.#shapeRunners.get(scenario.shape);
    if (runner === undefined) {
      throw RuntimeError.create(`No smoke runner for scenario shape '${scenario.shape}'`);
    }
    await runner(scenario, context);
  }

  /** Intakes `scenarioFile` through `ExampleScenarioFileEntity` and registers one `it` per case. */
  static registerExampleSmokeSuite(scenarioFile: unknown, context: ExampleSmokeContextInterface): void {
    const scenarios = ExampleScenarioFileEntity.intake(scenarioFile);
    void describe('examples smoke', () => {
      for (const scenario of scenarios.cases) {
        void it(scenario.name, async () => {
          await ExampleSmokeRunner.runScenario(scenario, context);
        });
      }
    });
  }
}
