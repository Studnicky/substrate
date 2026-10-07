import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GpuDetector } from '../../src/modules/GpuDetector.js';
import scenarioGroups from './GpuDetector.scenarios.json' with { 'type': 'json' };

interface CommandOutcomeInterface {
  readonly 'error'?: string;
  readonly 'output'?: string;
}

interface GpuDetectorScenarioInterface {
  readonly 'description': string;
  readonly 'expected': {
    readonly 'computeApi'?: 'cuda' | 'metal' | 'opencl' | 'software';
    readonly 'name'?: string;
    readonly 'result': 'gpu' | 'null';
    readonly 'vramMb'?: number | null;
  };
  readonly 'input': {
    readonly 'commands'?: Record<string, CommandOutcomeInterface>;
    readonly 'platform': NodeJS.Platform;
  };
  readonly 'name': string;
}

class ScenarioDetectorDependencies {
  readonly #scenarioCase: GpuDetectorScenarioInterface;

  constructor(scenarioCase: GpuDetectorScenarioInterface) {
    this.#scenarioCase = scenarioCase;
  }

  execFileSync(command: string): Buffer {
    const outcome = this.#scenarioCase.input.commands?.[command];
    if (outcome === undefined) {
      throw RuntimeError.create(`unexpected command: ${command}`);
    }

    if (typeof outcome.error === 'string') {
      throw RuntimeError.create(outcome.error);
    }

    const output = Buffer.from(outcome.output ?? '');
    return output;
  }

  platform(): NodeJS.Platform {
    return this.#scenarioCase.input.platform;
  }
}

class GpuDetectorScenarioRunner {
  static run(scenarioCase: GpuDetectorScenarioInterface): void {
    const result = GpuDetector.detect(new ScenarioDetectorDependencies(scenarioCase));

    if (scenarioCase.expected.result === 'null') {
      assert.equal(result, null);
      return;
    }

    assert.deepEqual(result, {
      'computeApi': scenarioCase.expected.computeApi,
      'name': scenarioCase.expected.name,
      'vramMb': scenarioCase.expected.vramMb
    });
  }
}

void describe('GpuDetector', () => {
  const scenarios = scenarioGroups.cases as GpuDetectorScenarioInterface[];
  scenarios.forEach((scenario) => {
    void it(scenario.name, () => {
      GpuDetectorScenarioRunner.run(scenario);
    });
  });
});
