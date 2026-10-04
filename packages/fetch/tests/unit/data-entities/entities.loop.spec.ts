import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { ClientConfigDataEntity, FetchRequestOptionsEntity, QueryParametersEntity } from '../../../src/entities/index.js';
import { ADDITIONAL_PROPERTIES_MESSAGE, HEADER_VALUE_TYPE_MESSAGE, UNDEFINED_JSON_MESSAGE } from './constants/ENTITY_INTAKE_MESSAGES.js';
import scenarioGroups from './entities.scenarios.json' with { 'type': 'json' };
import { EntitiesScenarioCaseEntity } from './entities/EntitiesScenarioCaseEntity.js';

class EntitiesRunners {
  static declaresIntakeTests(): void {
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
      }, ADDITIONAL_PROPERTIES_MESSAGE);
    });

    void it('omits an undefined composed request method while retaining nested validation', () => {
      assert.deepStrictEqual(ClientConfigDataEntity.intake({ 'options': { 'method': undefined } }), { 'options': {} });
      assert.throws(() => {
        ClientConfigDataEntity.intake({ 'options': { 'headers': { 'authorization': 3 }, 'method': undefined } });
      }, HEADER_VALUE_TYPE_MESSAGE);
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
      }, UNDEFINED_JSON_MESSAGE);
    });
  }

  static 'validates'(scenarioCase: ScenarioCaseOfType<EntitiesScenarioCaseEntity.Type, 'validates', 'operation'>): void {
    const { validations } = scenarioCase.input;
    const results: boolean[] = [];
    for (let index = 0; index < validations.length; index += 1) {
      const validation = validations[index];
      if (validation !== undefined) {
        const result = EntitiesRunners.validate(validation.entity, validation.value);
        assert.equal(result, validation.expected);
        results.push(result);
      }
    }

    assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
  }

  private static validate(entity: 'ClientConfigDataEntity' | 'FetchRequestOptionsEntity' | 'QueryParametersEntity', value: object | boolean | number | string | null): boolean {
    if (entity === 'ClientConfigDataEntity') {
      const accepted = ClientConfigDataEntity.validate(value);
      return accepted;
    }
    if (entity === 'FetchRequestOptionsEntity') {
      const accepted = FetchRequestOptionsEntity.validate(value);
      return accepted;
    }
    const accepted = QueryParametersEntity.validate(value);
    return accepted;
  }
}

ScenarioSuite.registerBy('operation', {
  'entity': EntitiesScenarioCaseEntity,
  'extraTests': EntitiesRunners.declaresIntakeTests,
  'file': scenarioGroups,
  'name': 'fetch data entities',
  'runners': EntitiesRunners
});
