import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { ScenarioCaseOfType } from '../../src/types/ScenarioCaseOfType.js';

import { ScenarioCaseIntakeError } from '../../src/errors/ScenarioCaseIntakeError.js';
import { ScenarioSuite } from '../../src/ScenarioSuite.js';
import { ScenarioSuiteOperationScenarioCaseEntity } from './entities/ScenarioSuiteOperationScenarioCaseEntity.js';
import { ScenarioSuiteScenarioCaseEntity } from './entities/ScenarioSuiteScenarioCaseEntity.js';
import scenarioGroups from './ScenarioSuite.scenarios.json' with { 'type': 'json' };
import scenarioOperations from './ScenarioSuiteOperation.scenarios.json' with { 'type': 'json' };

class ScenarioSuiteLedger {
  static readonly entries: string[] = [];
  static readonly results: number[] = [];
}

class ScenarioSuiteShapeRunners {
  static 'sync-record'(scenarioCase: ScenarioCaseOfType<ScenarioSuiteScenarioCaseEntity.Type, 'sync-record'>): void {
    ScenarioSuiteLedger.entries.push(`sync:${scenarioCase.input.value}`);
  }

  static async 'async-record'(scenarioCase: ScenarioCaseOfType<ScenarioSuiteScenarioCaseEntity.Type, 'async-record'>): Promise<void> {
    ScenarioSuiteLedger.entries.push(`async-start:${scenarioCase.input.value}`);
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    ScenarioSuiteLedger.entries.push(`async-end:${scenarioCase.input.value}`);
  }

  static declaresDispatchOrder(): void {
    void it('dispatches every case to the runner its shape names, awaiting each in file order', () => {
      assert.deepStrictEqual(ScenarioSuiteLedger.entries, [
        'sync:a', 'async-start:b', 'async-end:b', 'sync:c', 'async-start:d', 'async-end:d'
      ]);
    });

    void it('rejects a scenario file holding an invalid case at registration, naming the case', () => {
      assert.throws(
        () => {
          ScenarioSuite.register({
            'entity': ScenarioSuiteScenarioCaseEntity,
            'file': { 'cases': [{ 'description': 'bad', 'input': { 'value': 1 }, 'name': 'bad-case', 'shape': 'sync-record' }] },
            'name': 'never registered',
            'runners': ScenarioSuiteShapeRunners
          });
        },
        (error: Error) => {
          assert.ok(error instanceof ScenarioCaseIntakeError);
          assert.ok(error.message.includes("cases[0] 'bad-case' rejected"), error.message);
          return true;
        }
      );
    });
  }
}

class ScenarioSuiteOperationRunners {
  static 'double'(scenarioCase: ScenarioCaseOfType<ScenarioSuiteOperationScenarioCaseEntity.Type, 'double', 'operation'>): void {
    ScenarioSuiteLedger.results.push(scenarioCase.input.operand * 2);
    assert.equal(ScenarioSuiteLedger.results.at(-1), scenarioCase.expected.result);
  }

  static 'negate'(scenarioCase: ScenarioCaseOfType<ScenarioSuiteOperationScenarioCaseEntity.Type, 'negate', 'operation'>): void {
    ScenarioSuiteLedger.results.push(-scenarioCase.input.operand);
    assert.equal(ScenarioSuiteLedger.results.at(-1), scenarioCase.expected.result);
  }

  static declaresDispatchOrder(): void {
    void it('dispatches on the named discriminant field', () => {
      assert.deepStrictEqual(ScenarioSuiteLedger.results, [8, -4]);
    });
  }
}

ScenarioSuite.register({
  'entity': ScenarioSuiteScenarioCaseEntity,
  'extraTests': ScenarioSuiteShapeRunners.declaresDispatchOrder,
  'file': scenarioGroups,
  'name': 'ScenarioSuite by shape',
  'runners': ScenarioSuiteShapeRunners,
  'timeoutMs': 5000
});

ScenarioSuite.registerBy('operation', {
  'entity': ScenarioSuiteOperationScenarioCaseEntity,
  'extraTests': ScenarioSuiteOperationRunners.declaresDispatchOrder,
  'file': scenarioOperations,
  'name': 'ScenarioSuite by operation',
  'runners': ScenarioSuiteOperationRunners
});
