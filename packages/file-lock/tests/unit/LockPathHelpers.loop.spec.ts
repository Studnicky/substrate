import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LockPathHelpers } from '../../src/LockPathHelpers.js';
import scenarioGroups from './LockPathHelpers.scenarios.json';

type ScenarioCase =
  | {
      description: string;
      expected: { value: string };
      input: { shape: 'basename-bare-relative' | 'basename-nested'; path: string };
      shape: 'basename-bare-relative' | 'basename-nested';
      name: string;
    }
  | {
      description: string;
      expected: { value: string };
      input: { shape: 'dirname-absolute-multi' | 'dirname-absolute-single' | 'dirname-bare-relative' | 'dirname-relative-directory'; path: string };
      shape: 'dirname-absolute-multi' | 'dirname-absolute-single' | 'dirname-bare-relative' | 'dirname-relative-directory';
      name: string;
    };

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => void> = {
  'dirname-bare-relative': (scenarioCase) => {
    assert.strictEqual(LockPathHelpers.dirname(scenarioCase.input.path), scenarioCase.expected.value);
  },
  'dirname-relative-directory': (scenarioCase) => {
    assert.strictEqual(LockPathHelpers.dirname(scenarioCase.input.path), scenarioCase.expected.value);
  },
  'dirname-absolute-single': (scenarioCase) => {
    assert.strictEqual(LockPathHelpers.dirname(scenarioCase.input.path), scenarioCase.expected.value);
  },
  'dirname-absolute-multi': (scenarioCase) => {
    assert.strictEqual(LockPathHelpers.dirname(scenarioCase.input.path), scenarioCase.expected.value);
  },
  'basename-bare-relative': (scenarioCase) => {
    assert.strictEqual(LockPathHelpers.basename(scenarioCase.input.path), scenarioCase.expected.value);
  },
  'basename-nested': (scenarioCase) => {
    assert.strictEqual(LockPathHelpers.basename(scenarioCase.input.path), scenarioCase.expected.value);
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('LockPathHelpers', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
