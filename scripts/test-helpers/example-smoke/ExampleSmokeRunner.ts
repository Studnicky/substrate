import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import type { ExampleScenarioEntity } from './entities/ExampleScenarioEntity.js';
import type { ExampleSmokeContextInterface } from './interfaces/ExampleSmokeContextInterface.js';
import type { ShapeRunnerFunctionInterface } from './interfaces/ShapeRunnerFunctionInterface.js';

import { EXAMPLE_SMOKE_CONSTANTS } from './constants/ExampleSmokeConstants.js';
import { DocsPlaygroundPathsEntity } from './entities/DocsPlaygroundPathsEntity.js';
import { ExampleScenarioFileEntity } from './entities/ExampleScenarioFileEntity.js';
import { ExampleSmokeError } from './errors/ExampleSmokeError.js';

/** Registers a `describe`/`it` suite from a package's `examples.scenarios.json`, dispatching each case by its `shape`. */
export class ExampleSmokeRunner {
  static async runImportsExample(scenario: ExampleScenarioEntity.Type, context: ExampleSmokeContextInterface): Promise<void> {
    if (scenario.shape === 'imports-example') {
      const exampleUrl = ExampleSmokeRunner.#resolveUrl(scenario.input.file, context.specUrl);
      try {
        await import(exampleUrl.href);
      } catch (cause) {
        throw new ExampleSmokeError({
          'cause': cause,
          'code': 'exampleSmoke.exampleRejected',
          'message': `Example ${scenario.name} threw`
        });
      }
    }
  }

  static runBrowserExample(scenario: ExampleScenarioEntity.Type, context: ExampleSmokeContextInterface): void {
    if (scenario.shape === 'browser-example') {
      const playgroundPaths = DocsPlaygroundPathsEntity.intake(
        ExampleSmokeRunner.#readJson(EXAMPLE_SMOKE_CONSTANTS.DOCS_PLAYGROUND_PATHS_RELATIVE_URL, context.specUrl)
      );
      const exampleName = scenario.input.file
        .replace(EXAMPLE_SMOKE_CONSTANTS.FILE_BASENAME_PATTERN, '')
        .replace(EXAMPLE_SMOKE_CONSTANTS.TS_EXTENSION_PATTERN, '');
      const docsPlaygroundKey = `packages/${context.packageName}/examples/${exampleName}`;
      ExampleSmokeRunner.#expect(
        playgroundPaths.includes(docsPlaygroundKey),
        `Browser-only example ${scenario.name} must be registered as ${docsPlaygroundKey} in ExampleSourcePaths.json`
      );
    }
  }

  static runWorkerEntry(scenario: ExampleScenarioEntity.Type, context: ExampleSmokeContextInterface): void {
    if (scenario.shape === 'worker-entry') {
      const parentSource = ExampleSmokeRunner.#readText(scenario.input.parentFile, context.specUrl);
      const workerFileName = scenario.input.file.replace(EXAMPLE_SMOKE_CONSTANTS.FILE_BASENAME_PATTERN, '');
      ExampleSmokeRunner.#expect(
        parentSource.includes(workerFileName),
        `Worker entry ${scenario.name} must be referenced by ${scenario.input.parentFile}`
      );
    }
  }

  static #expect(holds: boolean, message: string): void {
    if (holds) {
      return;
    }
    throw new ExampleSmokeError({
      'code': 'exampleSmoke.assertionFailed',
      'message': message
    });
  }

  static #resolveUrl(relativeUrl: string, specUrl: string): URL {
    try {
      const resolved = new URL(relativeUrl, specUrl);
      return resolved;
    } catch (cause) {
      throw new ExampleSmokeError({
        'cause': cause,
        'code': 'exampleSmoke.urlInvalid',
        'message': `Example smoke path '${relativeUrl}' does not resolve against '${specUrl}'`
      });
    }
  }

  static #readText(relativeUrl: string, specUrl: string): string {
    try {
      const text = readFileSync(fileURLToPath(ExampleSmokeRunner.#resolveUrl(relativeUrl, specUrl)), 'utf8');
      return text;
    } catch (cause) {
      throw new ExampleSmokeError({
        'cause': cause,
        'code': 'exampleSmoke.fileUnreadable',
        'message': `Example smoke file '${relativeUrl}' could not be read`
      });
    }
  }

  static #readJson(relativeUrl: string, specUrl: string): unknown {
    const text = ExampleSmokeRunner.#readText(relativeUrl, specUrl);
    try {
      const parsed: unknown = JSON.parse(text);
      return parsed;
    } catch (cause) {
      throw new ExampleSmokeError({
        'cause': cause,
        'code': 'exampleSmoke.jsonInvalid',
        'message': `Example smoke file '${relativeUrl}' is not valid JSON`
      });
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
      throw new ExampleSmokeError({
        'code': 'exampleSmoke.unknownShape',
        'message': `No smoke runner for scenario shape '${scenario.shape}'`
      });
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
