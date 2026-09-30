import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { GpuDetector } from '../../src/modules/GpuDetector.js';
import { GpuDetectorScenarioCaseEntity } from './entities/GpuDetectorScenarioCaseEntity.js';
import scenarioGroups from './GpuDetector.scenarios.json' with { 'type': 'json' };

class ScriptedGpuDependencies {
  readonly #outcomes: Map<string, NonNullable<GpuDetectorScenarioCaseEntity.Type['input']['commands']>[string]>;
  readonly #platform: 'darwin' | 'linux' | 'win32';

  constructor(input: GpuDetectorScenarioCaseEntity.Type['input']) {
    this.#outcomes = new Map(Object.entries(input.commands ?? {}));
    this.#platform = input.platform;
  }

  execFileSync(command: string): Buffer {
    const outcome = this.#outcomes.get(command);
    if (outcome === undefined) {
      throw RuntimeError.create(`unexpected command: ${command}`);
    }

    if (typeof outcome.error === 'string') {
      throw RuntimeError.create(outcome.error);
    }

    const output = Buffer.from(outcome.output ?? '');
    return output;
  }

  platform(): 'darwin' | 'linux' | 'win32' {
    return this.#platform;
  }
}

class GpuDetectorRunners {
  static 'detect'(scenarioCase: ScenarioCaseOfType<GpuDetectorScenarioCaseEntity.Type, 'detect'>): void {
    const result = GpuDetector.detect(new ScriptedGpuDependencies(scenarioCase.input));

    if (scenarioCase.expected.result === 'null') {
      assert.equal(result, null);
    } else {
      assert.deepEqual(result, {
        'computeApi': scenarioCase.expected.computeApi,
        'name': scenarioCase.expected.name,
        'vramMb': scenarioCase.expected.vramMb
      });
    }
  }
}

ScenarioSuite.register({
  'entity': GpuDetectorScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'GpuDetector',
  'runners': GpuDetectorRunners
});
