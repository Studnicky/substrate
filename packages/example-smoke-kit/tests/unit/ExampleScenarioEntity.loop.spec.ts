import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ExampleScenarioFileEntity } from '../../src/entities/ExampleScenarioFileEntity.js';

interface ScenarioCaseInterface {
  readonly 'description': string;
  readonly 'expected': { readonly 'valid': boolean };
  readonly 'input': { readonly 'file': Record<string, unknown> };
  readonly 'name': string;
}

class ExampleScenarioEntityRunners {
  static run(scenarioCase: ScenarioCaseInterface): void {
    const result = ExampleScenarioFileEntity.validate(scenarioCase.input.file);
    assert.equal(result, scenarioCase.expected.valid);
  }

  static createImportsExampleValidCase(): ScenarioCaseInterface {
    const caseObject: ScenarioCaseInterface = {
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
    };
    return caseObject;
  }

  static createBrowserExampleValidCase(): ScenarioCaseInterface {
    const caseObject: ScenarioCaseInterface = {
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
    };
    return caseObject;
  }

  static createWorkerEntryValidCase(): ScenarioCaseInterface {
    const caseObject: ScenarioCaseInterface = {
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
    };
    return caseObject;
  }

  static createUnknownShapeInvalidCase(): ScenarioCaseInterface {
    const caseObject: ScenarioCaseInterface = {
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
    };
    return caseObject;
  }

  static createMissingNameInvalidCase(): ScenarioCaseInterface {
    const caseObject: ScenarioCaseInterface = {
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
    };
    return caseObject;
  }
}

void describe('ExampleScenarioFileEntity', () => {
  const scenarioCases: readonly ScenarioCaseInterface[] = [
    ExampleScenarioEntityRunners.createImportsExampleValidCase(),
    ExampleScenarioEntityRunners.createBrowserExampleValidCase(),
    ExampleScenarioEntityRunners.createWorkerEntryValidCase(),
    ExampleScenarioEntityRunners.createUnknownShapeInvalidCase(),
    ExampleScenarioEntityRunners.createMissingNameInvalidCase()
  ];
  for (let index = 0; index < scenarioCases.length; index += 1) {
    const scenarioCase = scenarioCases[index];
    if (typeof scenarioCase !== 'undefined') {
      void it(scenarioCase.name, () => {
        ExampleScenarioEntityRunners.run(scenarioCase);
      });
    }
  }
});
