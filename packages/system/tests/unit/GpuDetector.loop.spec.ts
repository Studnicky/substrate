import { RuntimeError } from '@studnicky/errors';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GpuDetector } from '../../src/modules/GpuDetector.js';
import scenarioGroups from './GpuDetector.scenarios.json' with { type: 'json' };

interface CommandOutcomeInterface {
  readonly error?: string;
  readonly output?: string;
}

type ScenarioCase = {
  readonly description: string;
  readonly expected: {
    readonly computeApi?: 'cuda' | 'metal' | 'opencl' | 'software';
    readonly name?: string;
    readonly result: 'gpu' | 'null';
    readonly vramMb?: number | null;
  };
  readonly input: {
    readonly commands?: Record<string, CommandOutcomeInterface>;
    readonly platform: NodeJS.Platform;
  };
  readonly shape: 'detect';
  readonly name: string;
};

function runCase(scenarioCase: ScenarioCase): void {
  const result = GpuDetector.detect({
    'execFileSync': (command: string): Buffer => {
      const outcome = scenarioCase.input.commands?.[command];
      if (outcome === undefined) {
        throw RuntimeError.create(`unexpected command: ${command}`);
      }

      if (typeof outcome.error === 'string') {
        throw RuntimeError.create(outcome.error);
      }

      return Buffer.from(outcome.output ?? '');
    },
    'platform': () => scenarioCase.input.platform
  });

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

void describe('GpuDetector', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
