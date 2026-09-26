import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Throttle } from '../../../src/throttle/index.js';
import { InstantiationScenarioCaseEntity } from './entities/InstantiationScenarioCaseEntity.js';
import scenarioGroups from './instantiation.scenarios.json' with { type: 'json' };

type ScenarioCase = InstantiationScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(InstantiationScenarioCaseEntity.Schema, InstantiationScenarioCaseEntity.Node);

class ThrottleTestHelpers {
  public static async factoryResult(): Promise<string> {
    return 'factory-result';
  }

  public static async chainedResult(): Promise<string> {
    return 'chained-result';
  }

  public static async multiplyAsync(first: number, second: number): Promise<number> {
    return first * second;
  }
}

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void> | void;
type RunnerMap = { [K in ScenarioCase['shape']]: ScenarioRunner<K> };

const runnerMap: RunnerMap = {
    'chain-execute-after-create': async (scenarioCase) => {
      const result = await Throttle.create(scenarioCase.input.throttle).execute(ThrottleTestHelpers.chainedResult);
      assert.strictEqual(result, scenarioCase.expected.result);
    },
    'create-with-config': (scenarioCase) => {
      const throttle = Throttle.create(scenarioCase.input.throttle);
      assert.ok(throttle instanceof Throttle);
      assert.strictEqual(throttle.getStats().concurrencyLimit, scenarioCase.expected.concurrencyLimit);
    },
    'create-with-default': (scenarioCase) => {
      const throttle = Throttle.create(scenarioCase.input.throttle);
      assert.strictEqual(throttle.getStats().concurrencyLimit, scenarioCase.expected.concurrencyLimit);
    },
    'execute-closure-arguments': async (scenarioCase) => {
      const result = await Throttle.create(scenarioCase.input.throttle).execute(async () => {
        return ThrottleTestHelpers.multiplyAsync(3, 4);
      });
      assert.strictEqual(result, scenarioCase.expected.result);
    },
    'execute-created-throttle': async (scenarioCase) => {
      const result = await Throttle.create(scenarioCase.input.throttle).execute(ThrottleTestHelpers.factoryResult);
      assert.strictEqual(result, scenarioCase.expected.result);
    }
};

async function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Throttle instantiation', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
