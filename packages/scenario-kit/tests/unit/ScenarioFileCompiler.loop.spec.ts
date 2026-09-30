import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../src/types/ScenarioCaseOfType.js';

import { ScenarioFileCompiler } from '../../src/ScenarioFileCompiler.js';
import { ScenarioSuite } from '../../src/ScenarioSuite.js';
import { ScenarioValues } from '../../src/ScenarioValues.js';
import { ScenarioFileCompilerScenarioCaseEntity } from './entities/ScenarioFileCompilerScenarioCaseEntity.js';
import { ArithmeticScenarioCaseEntity } from './fixtures/ArithmeticScenarioCaseEntity.js';
import { SumScenarioCaseEntity } from './fixtures/SumScenarioCaseEntity.js';
import scenarioGroups from './ScenarioFileCompiler.scenarios.json' with { 'type': 'json' };

class ScenarioFileCompilerRunners {
  static 'sum-file-valid'(scenarioCase: ScenarioCaseOfType<ScenarioFileCompilerScenarioCaseEntity.Type, 'sum-file-valid'>): void {
    const parsed = ScenarioFileCompiler.compileIntake(SumScenarioCaseEntity)(scenarioCase.input.file);
    assert.equal(parsed.cases.length, scenarioCase.expected.casesLength);
    const totalSum = parsed.cases.reduce((total, scenario) => {
      const next = total + scenario.expected.sum;
      return next;
    }, 0);
    assert.equal(totalSum, scenarioCase.expected.totalSum);
  }

  static 'arithmetic-file-valid'(scenarioCase: ScenarioCaseOfType<ScenarioFileCompilerScenarioCaseEntity.Type, 'arithmetic-file-valid'>): void {
    const parsed = ScenarioFileCompiler.compileIntake(ArithmeticScenarioCaseEntity)(scenarioCase.input.file);
    assert.equal(parsed.cases.length, scenarioCase.expected.casesLength);
    const totalResult = parsed.cases.reduce((total, scenario) => {
      const operand = scenario.shape === 'add' ? scenario.input.a + scenario.input.b : scenario.input.a * scenario.input.b;
      const next = total + operand;
      return next;
    }, 0);
    assert.equal(totalResult, scenarioCase.expected.totalResult);
  }

  static 'rejects'(scenarioCase: ScenarioCaseOfType<ScenarioFileCompilerScenarioCaseEntity.Type, 'rejects'>): void {
    const intake = scenarioCase.input.target === 'sum'
      ? ScenarioFileCompiler.compileIntake(SumScenarioCaseEntity)
      : ScenarioFileCompiler.compileIntake(ArithmeticScenarioCaseEntity);
    let failure: BaseError | undefined;
    try {
      intake(scenarioCase.input.file);
    } catch (error) {
      if (error instanceof BaseError) {
        failure = error;
      }
    }
    const rejection = ScenarioValues.requireDefined(failure, 'the intake rejection');
    assert.equal(rejection.code, scenarioCase.expected.code);
    assert.ok(rejection.message.includes(scenarioCase.expected.messageIncludes), rejection.message);
  }
}

ScenarioSuite.register({
  'entity': ScenarioFileCompilerScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'ScenarioFileCompiler',
  'runners': ScenarioFileCompilerRunners
});
