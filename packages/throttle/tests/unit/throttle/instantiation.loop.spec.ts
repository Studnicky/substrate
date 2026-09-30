import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { Throttle } from '../../../src/throttle/index.js';
import { InstantiationScenarioCaseEntity } from './entities/InstantiationScenarioCaseEntity.js';
import scenarioGroups from './instantiation.scenarios.json' with { 'type': 'json' };

class InstantiationRunners {
  static async 'chain-execute-after-create'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'chain-execute-after-create'>): Promise<void> {
    const result = await Throttle.create(scenarioCase.input.throttle).execute(() => {
      const settled = Promise.resolve('chained-result');
      return settled;
    });
    assert.strictEqual(result, scenarioCase.expected.result);
  }

  static 'create-with-config'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'create-with-config'>): void {
    const throttle = Throttle.create(scenarioCase.input.throttle);
    assert.ok(throttle instanceof Throttle);
    assert.strictEqual(throttle.getStats().concurrencyLimit, scenarioCase.expected.concurrencyLimit);
  }

  static 'create-with-default'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'create-with-default'>): void {
    const throttle = Throttle.create(scenarioCase.input.throttle);
    assert.strictEqual(throttle.getStats().concurrencyLimit, scenarioCase.expected.concurrencyLimit);
  }

  static async 'execute-closure-arguments'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'execute-closure-arguments'>): Promise<void> {
    const factors = [3, 4];
    const result = await Throttle.create(scenarioCase.input.throttle).execute(() => {
      const settled = Promise.resolve((factors[0] ?? 0) * (factors[1] ?? 0));
      return settled;
    });
    assert.strictEqual(result, scenarioCase.expected.result);
  }

  static async 'execute-created-throttle'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'execute-created-throttle'>): Promise<void> {
    const result = await Throttle.create(scenarioCase.input.throttle).execute(() => {
      const settled = Promise.resolve('factory-result');
      return settled;
    });
    assert.strictEqual(result, scenarioCase.expected.result);
  }
}

ScenarioSuite.register({
  'entity': InstantiationScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Throttle instantiation',
  'runners': InstantiationRunners
});
