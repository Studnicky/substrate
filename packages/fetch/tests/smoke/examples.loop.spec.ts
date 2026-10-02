import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { FetchTestError } from '../helpers/FetchTestError.js';
import { ExamplesScenarioCaseEntity } from './entities/ExamplesScenarioCaseEntity.js';
import scenarioGroups from './examples.scenarios.json' with { 'type': 'json' };

class ExamplesRunners {
  static async 'imports-example'(scenarioCase: ScenarioCaseOfType<ExamplesScenarioCaseEntity.Type, 'imports-example'>): Promise<void> {
    const href = ExamplesRunners.resolveHref(scenarioCase.input.entrypoint);
    await assert.doesNotReject(async () => {
      await import(href);
    }, `Example ${scenarioCase.input.entrypoint} threw`);
  }

  private static resolveHref(entrypoint: string): string {
    let href = '';
    try {
      href = new URL(entrypoint, import.meta.url).href;
    } catch (error) {
      throw new FetchTestError(`Example entrypoint ${entrypoint} is not a resolvable URL`, error);
    }
    return href;
  }
}

ScenarioSuite.register({
  'entity': ExamplesScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'examples smoke',
  'runners': ExamplesRunners
});
