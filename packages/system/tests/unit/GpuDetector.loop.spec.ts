import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GpuDetector } from '../../src/modules/GpuDetector.js';
import { GpuDetectorScenarioCaseEntity } from './entities/GpuDetectorScenarioCaseEntity.js';
import scenarioGroups from './GpuDetector.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(GpuDetectorScenarioCaseEntity.Schema, GpuDetectorScenarioCaseEntity.Node);

function runCase(scenarioCase: GpuDetectorScenarioCaseEntity.Type): void {
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
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
