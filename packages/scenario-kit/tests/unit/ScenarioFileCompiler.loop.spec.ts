import { SchemaIntakeError } from '@studnicky/entity/browser';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ScenarioFileCompiler } from '../../src/ScenarioFileCompiler.js';
import { ArithmeticScenarioCaseEntity } from './fixtures/ArithmeticScenarioCaseEntity.js';
import { SumScenarioCaseEntity } from './fixtures/SumScenarioCaseEntity.js';

type ScenarioCase =
  | { description: string; expected: { casesLength: number; totalSum: number }; input: { file: unknown }; name: string; shape: 'sum-file-valid' }
  | { description: string; expected: { casesLength: number; totalResult: number }; input: { file: unknown }; name: string; shape: 'arithmetic-file-valid' }
  | { description: string; expected: { messageIncludes: string }; input: { file: unknown; target: 'arithmetic' | 'sum' }; name: string; shape: 'rejects' };

const scenarioCases: readonly ScenarioCase[] = [
  {
    'description': 'a well-formed single-shape file intakes to a typed case list',
    'expected': { 'casesLength': 2, 'totalSum': 7 },
    'input': {
      'file': {
        'cases': [
          { 'description': 'one plus two', 'expected': { 'sum': 3 }, 'input': { 'a': 1, 'b': 2 }, 'name': 'one-plus-two' },
          { 'description': 'two plus two', 'expected': { 'sum': 4 }, 'input': { 'a': 2, 'b': 2 }, 'name': 'two-plus-two' }
        ]
      }
    },
    'name': 'sum-file-valid',
    'shape': 'sum-file-valid'
  },
  {
    'description': 'a well-formed discriminated-union file intakes each branch to its own narrowed type',
    'expected': { 'casesLength': 2, 'totalResult': 10 },
    'input': {
      'file': {
        'cases': [
          { 'description': 'add two and three', 'expected': { 'result': 5 }, 'input': { 'a': 2, 'b': 3 }, 'name': 'add-two-three', 'shape': 'add' },
          { 'description': 'multiply five by one', 'expected': { 'result': 5 }, 'input': { 'a': 5, 'b': 1 }, 'name': 'multiply-five-one', 'shape': 'multiply' }
        ]
      }
    },
    'name': 'arithmetic-file-valid',
    'shape': 'arithmetic-file-valid'
  },
  {
    'description': 'a file missing the required cases array rejects, naming the missing property',
    'expected': { 'messageIncludes': 'cases' },
    'input': { 'file': {}, 'target': 'sum' },
    'name': 'missing-cases-rejects',
    'shape': 'rejects'
  },
  {
    'description': 'a case with a wrong-typed field rejects, naming the offending path',
    'expected': { 'messageIncludes': 'sum' },
    'input': {
      'file': {
        'cases': [
          { 'description': 'bad sum', 'expected': { 'sum': 'not-a-number' }, 'input': { 'a': 1, 'b': 2 }, 'name': 'bad-sum' }
        ]
      },
      'target': 'sum'
    },
    'name': 'wrong-typed-field-rejects',
    'shape': 'rejects'
  },
  {
    'description': 'a case with an unrecognized discriminant rejects the whole oneOf',
    'expected': { 'messageIncludes': 'oneOf' },
    'input': {
      'file': {
        'cases': [
          { 'description': 'not add or multiply', 'expected': { 'result': 1 }, 'input': { 'a': 1, 'b': 1 }, 'name': 'subtract', 'shape': 'subtract' }
        ]
      },
      'target': 'arithmetic'
    },
    'name': 'unrecognized-discriminant-rejects',
    'shape': 'rejects'
  },
  {
    'description': 'an unexpected top-level property on the envelope rejects',
    'expected': { 'messageIncludes': 'additional properties' },
    'input': { 'file': { 'cases': [], 'extra': true }, 'target': 'sum' },
    'name': 'unexpected-envelope-property-rejects',
    'shape': 'rejects'
  }
];

const sumFileIntake = ScenarioFileCompiler.compileIntake(SumScenarioCaseEntity.Schema, SumScenarioCaseEntity.Node);
const arithmeticFileIntake = ScenarioFileCompiler.compileIntake(ArithmeticScenarioCaseEntity.Schema, ArithmeticScenarioCaseEntity.Node);
const rejectIntakeMap = { 'arithmetic': arithmeticFileIntake, 'sum': sumFileIntake };

const scenarioRunners: { [K in ScenarioCase['shape']]: (scenarioCase: Extract<ScenarioCase, { shape: K }>) => void } = {
  'sum-file-valid': (scenarioCase) => {
    const parsed = sumFileIntake(scenarioCase.input.file);
    assert.equal(parsed.cases.length, scenarioCase.expected.casesLength);
    const totalSum = parsed.cases.reduce((total, scenario) => total + scenario.expected.sum, 0);
    assert.equal(totalSum, scenarioCase.expected.totalSum);
  },

  'arithmetic-file-valid': (scenarioCase) => {
    const parsed = arithmeticFileIntake(scenarioCase.input.file);
    assert.equal(parsed.cases.length, scenarioCase.expected.casesLength);
    const totalResult = parsed.cases.reduce((total, scenario) => {
      if (scenario.shape === 'add') {
        return total + (scenario.input.a + scenario.input.b);
      }
      return total + (scenario.input.a * scenario.input.b);
    }, 0);
    assert.equal(totalResult, scenarioCase.expected.totalResult);
  },

  'rejects': (scenarioCase) => {
    const intake = rejectIntakeMap[scenarioCase.input.target];
    assert.throws(
      () => intake(scenarioCase.input.file),
      (error: unknown) => {
        assert.ok(error instanceof SchemaIntakeError);
        assert.ok(error.message.includes(scenarioCase.expected.messageIncludes), error.message);
        return true;
      }
    );
  }
};

function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): void {
  scenarioRunners[scenarioCase.shape](scenarioCase);
}

void describe('ScenarioFileCompiler', () => {
  for (const scenarioCase of scenarioCases) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
