import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { QueryParametersInterface } from '../../../src/node/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { FetchClient, UrlQueryString } from '../../../src/node/index.js';
import { RuntimeValueMaterializer } from '../../helpers/RuntimeValueMaterializer.js';
import { QueryScenarioCaseEntity } from './entities/QueryScenarioCaseEntity.js';
import scenarioGroups from './query.scenarios.json' with { 'type': 'json' };

class QueryRunners {
  static declaresRuntimeUndefinedTests(): void {
    void it('omits runtime undefined values before intaking JSON-safe parameters', () => {
      const parameters: QueryParametersInterface = {
        'filter': undefined,
        'nullValue': null,
        'tags': ['typescript', undefined, null]
      };

      assert.strictEqual(UrlQueryString.buildQueryString(parameters), 'nullValue=null&tags=typescript&tags=null');

      const invalidParameters: QueryParametersInterface = {};
      Reflect.set(invalidParameters, 'filter', { 'status': 'active' });

      assert.throws(() => {
        UrlQueryString.buildQueryString(invalidParameters);
      });
    });

    void it('intakes configured parameters after omitting runtime undefined values', () => {
      const client = FetchClient.create({
        'parameters': {
          'filter': undefined,
          'nullValue': null,
          'tags': ['typescript', undefined, null]
        }
      });

      const queryParameters: unknown = Reflect.get(client, 'queryParameters');
      assert.deepStrictEqual(queryParameters, {
        'nullValue': null,
        'tags': ['typescript', null]
      });

      const invalidParameters: QueryParametersInterface = {};
      Reflect.set(invalidParameters, 'filter', { 'status': 'active' });

      assert.throws(() => {
        FetchClient.create({ 'parameters': invalidParameters });
      });
    });
  }

  static 'build-query-string'(scenarioCase: ScenarioCaseOfType<QueryScenarioCaseEntity.Type, 'build-query-string', 'operation'>): void {
    assert.strictEqual(
      UrlQueryString.buildQueryString(QueryRunners.materializeParameters(scenarioCase.input.parameters)),
      scenarioCase.expected.output
    );
  }

  static 'build-url'(scenarioCase: ScenarioCaseOfType<QueryScenarioCaseEntity.Type, 'build-url', 'operation'>): void {
    assert.strictEqual(
      UrlQueryString.buildUrl(scenarioCase.input.baseUrl, QueryRunners.materializeParameters(scenarioCase.input.parameters)),
      scenarioCase.expected.output
    );
  }

  static 'build-url-without-parameters'(scenarioCase: ScenarioCaseOfType<QueryScenarioCaseEntity.Type, 'build-url-without-parameters', 'operation'>): void {
    assert.strictEqual(UrlQueryString.buildUrl(scenarioCase.input.baseUrl), scenarioCase.expected.output);
  }

  static 'parse-query-string'(scenarioCase: ScenarioCaseOfType<QueryScenarioCaseEntity.Type, 'parse-query-string', 'operation'>): void {
    assert.deepStrictEqual(
      UrlQueryString.parseQueryString(scenarioCase.input.queryString),
      scenarioCase.expected.output
    );
  }

  private static materializeParameters(parameters: ScenarioCaseOfType<QueryScenarioCaseEntity.Type, 'build-query-string', 'operation'>['input']['parameters']): QueryParametersInterface {
    const materialized = RuntimeValueMaterializer.materialize(parameters);
    assert.ok(QueryRunners.isQueryParameters(materialized), 'query parameters must contain scalar values or scalar arrays');
    return materialized;
  }

  private static isQueryParameters(value: unknown): value is QueryParametersInterface {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const members = Object.values(value);
      let accepted = true;
      for (let index = 0; index < members.length; index += 1) {
        accepted = accepted && QueryRunners.isQueryParameterValue(members[index]);
      }
      return accepted;
    }
    return false;
  }

  private static isScalar(value: unknown): boolean {
    const scalar = value === undefined || value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string';
    return scalar;
  }

  private static isQueryParameterValue(value: unknown): boolean {
    let accepted = QueryRunners.isScalar(value);
    if (Array.isArray(value)) {
      accepted = true;
      for (let index = 0; index < value.length; index += 1) {
        accepted = accepted && QueryRunners.isScalar(value[index]);
      }
    }
    return accepted;
  }
}

ScenarioSuite.registerBy('operation', {
  'entity': QueryScenarioCaseEntity,
  'extraTests': QueryRunners.declaresRuntimeUndefinedTests,
  'file': scenarioGroups,
  'name': 'fetch query utils',
  'runners': QueryRunners
});
