import { describe, it } from 'node:test';

import type { ScenarioSuiteOptionsInterface } from '../interfaces/ScenarioSuiteOptionsInterface.js';
import type { ScenarioCaseOfType } from '../types/ScenarioCaseOfType.js';
import type { ScenarioCaseType } from '../types/ScenarioCaseType.js';
import type { ScenarioRunnerMapType } from '../types/ScenarioRunnerMapType.js';

import { ScenarioFileCompiler } from '../ScenarioFileCompiler.js';

/** Registers a scenario file with `node:test`: one `it` per case, each routed to the runner its discriminant names. */
export class ScenarioSuite {
  /** Cases discriminated by `shape`. */
  static register<TCase extends ScenarioCaseType<'shape'>>(options: ScenarioSuiteOptionsInterface<TCase>): void {
    ScenarioSuite.registerBy('shape', options);
  }

  /** Cases discriminated by the field named `discriminant`. */
  static registerBy<TCase extends ScenarioCaseType<TKey>, TKey extends string>(discriminant: TKey, options: ScenarioSuiteOptionsInterface<TCase, TKey>): void {
    const file = ScenarioFileCompiler.compileIntake(options.entity)(options.file);
    const timeout = options.timeoutMs ?? Infinity;
    void describe(options.name, () => {
      for (let index = 0; index < file.cases.length; index += 1) {
        const scenarioCase = file.cases[index];
        if (scenarioCase !== undefined) {
          void it(scenarioCase.name, { 'timeout': timeout }, async () => {
            await ScenarioSuite.run(options.runners, discriminant, scenarioCase);
          });
        }
      }
      options.extraTests?.();
    });
  }

  private static async run<TCase extends ScenarioCaseType<TKey>, TKey extends string>(
    runners: ScenarioRunnerMapType<TCase, TKey>, discriminant: TKey, scenarioCase: TCase
  ): Promise<void> {
    const shape = scenarioCase[discriminant];
    if (ScenarioSuite.hasShape(scenarioCase, discriminant, shape)) {
      await runners[shape](scenarioCase);
    }
  }

  private static hasShape<TCase extends ScenarioCaseType<TKey>, TKey extends string, TShape extends TCase[TKey]>(
    scenarioCase: TCase, discriminant: TKey, shape: TShape
  ): scenarioCase is ScenarioCaseOfType<TCase, TShape, TKey> & TCase {
    const matches = scenarioCase[discriminant] === shape;
    return matches;
  }
}
