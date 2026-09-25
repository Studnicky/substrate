import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ExampleScenarioFileEntity } from '../../src/entities/ExampleScenarioFileEntity.js';

type ScenarioCase = {
  description: string;
  expected: { valid: boolean };
  input: { file: unknown };
  name: string;
};

const scenarioCases: readonly ScenarioCase[] = [
  {
    'description': 'a well-formed imports-example case validates',
    'expected': { 'valid': true },
    'input': {
      'file': {
        'cases': [
          {
            'description': 'runs without throwing',
            'expected': { 'importsWithoutThrow': true },
            'input': { 'file': '../../examples/basicCache.ts' },
            'name': 'basicCache',
            'shape': 'imports-example'
          }
        ]
      }
    },
    'name': 'imports-example-valid'
  },
  {
    'description': 'a well-formed browser-example case validates',
    'expected': { 'valid': true },
    'input': {
      'file': {
        'cases': [
          {
            'description': 'is registered in the docs playground',
            'expected': { 'registeredInDocsPlayground': true },
            'input': { 'file': '../../examples/browserOpfs.ts' },
            'name': 'browserOpfs',
            'shape': 'browser-example'
          }
        ]
      }
    },
    'name': 'browser-example-valid'
  },
  {
    'description': 'a well-formed worker-entry case validates',
    'expected': { 'valid': true },
    'input': {
      'file': {
        'cases': [
          {
            'description': 'is referenced by its parent example',
            'expected': { 'referencedByParent': true },
            'input': { 'file': '../../examples/worker.ts', 'parentFile': '../../examples/parent.ts' },
            'name': 'worker-entry',
            'shape': 'worker-entry'
          }
        ]
      }
    },
    'name': 'worker-entry-valid'
  },
  {
    'description': 'an unrecognized shape rejects',
    'expected': { 'valid': false },
    'input': {
      'file': {
        'cases': [
          {
            'description': 'unknown shape',
            'expected': {},
            'input': { 'file': '../../examples/x.ts' },
            'name': 'unknown',
            'shape': 'not-a-real-shape'
          }
        ]
      }
    },
    'name': 'unknown-shape-invalid'
  },
  {
    'description': 'a case missing its required name rejects',
    'expected': { 'valid': false },
    'input': {
      'file': {
        'cases': [
          {
            'description': 'no name',
            'expected': { 'importsWithoutThrow': true },
            'input': { 'file': '../../examples/x.ts' },
            'shape': 'imports-example'
          }
        ]
      }
    },
    'name': 'missing-name-invalid'
  }
];

function runCase(scenarioCase: ScenarioCase): void {
  const result = ExampleScenarioFileEntity.validate(scenarioCase.input.file);
  assert.equal(result, scenarioCase.expected.valid);
}

void describe('ExampleScenarioFileEntity', () => {
  for (const scenarioCase of scenarioCases) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
