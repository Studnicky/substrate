import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ClientConfigDataEntity, FetchRequestOptionsEntity, QueryParametersEntity } from '../../../src/entities/index.js';
import scenarioGroups from './entities.scenarios.json' with { type: 'json' };

type ValidationName = 'ClientConfigDataEntity' | 'FetchRequestOptionsEntity' | 'QueryParametersEntity';

type ValidationCase = { entity: ValidationName; expected: boolean; value: Record<string, unknown> };

type ScenarioCase =
  | {
      description: string;
      expected: { validationResults: boolean[] };
      input: { validations: ValidationCase[] };
      shape: 'client-config-invalid' | 'client-config-valid' | 'query-parameters-invalid' | 'query-parameters-valid' | 'request-options-invalid' | 'request-options-valid';
      name: string;
    };

const validatorMap: Record<ValidationName, (value: Record<string, unknown>) => boolean> = {
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
  void it('omits an undefined composed request method while retaining nested validation', () => {
    assert.deepStrictEqual(ClientConfigDataEntity.intake({ 'options': { 'method': undefined } }), { 'options': {} });
    assert.throws(() => {
      ClientConfigDataEntity.intake({ 'options': { 'headers': { 'authorization': 3 }, 'method': undefined } });
    }, /\/options\/headers\/authorization: must be string/u);
  });

  });
  void it('intakes query parameters as JSON-safe data', () => {
    const input = { 'active': true, 'tags': ['typescript', null] };

    const result = QueryParametersEntity.intake(input);

    assert.deepStrictEqual(result, input);
    assert.notStrictEqual(result, input);
    assert.throws(() => {
      QueryParametersEntity.intake({ 'filter': { 'status': 'active' } });
    });
  });
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
