import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';

import { ExamplesScenarioCaseEntity } from './entities/ExamplesScenarioCaseEntity.js';
import scenarioGroups from './examples.scenarios.json' with { 'type': 'json' };

class ExampleImportError extends BaseError {
  public override readonly name: string = 'ExampleImportError';

  public constructor(entrypoint: string, cause: unknown) {
    super({
      'cause': cause,
      'code': 'samplebuffer.exampleImportFailed',
      'message': `Example ${entrypoint} threw`,
      'retryable': false
    });
  }
}

class ExamplesRunners {
  static async 'imports-example'(scenarioCase: ScenarioCaseOfType<ExamplesScenarioCaseEntity.Type, 'imports-example'>): Promise<void> {
    assert.equal(scenarioCase.expected.importsWithoutThrow, true);
    try {
      await import(new URL(scenarioCase.input.entrypoint, import.meta.url).href);
    } catch (cause) {
      throw new ExampleImportError(scenarioCase.input.entrypoint, cause);
    }
  }
}

ScenarioSuite.register({
  'entity': ExamplesScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'examples smoke',
  'runners': ExamplesRunners
});
