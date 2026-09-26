import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ClientConfigDataEntity, FetchRequestOptionsEntity, QueryParametersEntity } from '../../../src/entities/index.js';

import { EntitiesScenarioCaseEntity } from './entities/EntitiesScenarioCaseEntity.js';
import scenarioGroups from './entities.scenarios.json' with { type: 'json' };

type ScenarioCase = EntitiesScenarioCaseEntity.Type;
type ValidationName = ScenarioCase['input']['validations'][number]['entity'];

const fileIntake = ScenarioFileCompiler.compileIntake(EntitiesScenarioCaseEntity.Schema, EntitiesScenarioCaseEntity.Node);

const validatorMap: Record<ValidationName, (value: unknown) => boolean> = {
  'ClientConfigDataEntity': (value) => ClientConfigDataEntity.validate(value),
  'FetchRequestOptionsEntity': (value) => FetchRequestOptionsEntity.validate(value),
  'QueryParametersEntity': (value) => QueryParametersEntity.validate(value)
};

function runCase(scenarioCase: ScenarioCase): void {
  const results = scenarioCase.input.validations.map((validation) => {
    const result = validatorMap[validation.entity](validation.value);
    assert.equal(result, validation.expected);
    return result;
  });

  assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
}

void describe('fetch data entities', () => {
  void it('intakes client configuration through its schema boundary', () => {
    const input = {
      'dispatcher': { 'connections': 4 },
      'options': { 'method': 'GET' },
      'parameters': { 'page': 1 }
    };

    const result = ClientConfigDataEntity.intake(input);

    assert.deepStrictEqual(result, input);
    assert.notStrictEqual(result, input);
    assert.notStrictEqual(result.dispatcher, input.dispatcher);
    assert.throws(() => {
      ClientConfigDataEntity.intake({ 'unexpected': true });
    }, /must NOT have additional properties/);
  });

  void it('omits an undefined composed request method while retaining nested validation', () => {
    assert.deepStrictEqual(ClientConfigDataEntity.intake({ 'options': { 'method': undefined } }), { 'options': {} });
    assert.throws(() => {
      ClientConfigDataEntity.intake({ 'options': { 'headers': { 'authorization': 3 }, 'method': undefined } });
    }, /\/options\/headers\/authorization: must be string/u);
  });

  void it('intakes query parameters as JSON-safe data', () => {
    const input = { 'active': true, 'tags': ['typescript', null] };

    const result = QueryParametersEntity.intake(input);

    assert.deepStrictEqual(result, input);
    assert.notStrictEqual(result, input);
    assert.throws(() => {
      QueryParametersEntity.intake({ 'filter': { 'status': 'active' } });
    });
    assert.throws(() => {
      QueryParametersEntity.intake({ 'omittedOnlyAtRuntime': undefined });
    }, /undefined is not valid JSON data/);
  });
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
