import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { HTTPError } from '../../../src/errors/index.js';
import { HttpErrorScenarioCaseEntity } from './entities/HttpErrorScenarioCaseEntity.js';
import scenarioGroups from './http-error.scenarios.json' with { 'type': 'json' };

class HttpErrorScenarioRunners {
  static 'catchable'(scenarioCase: ScenarioCaseOfType<HttpErrorScenarioCaseEntity.Type, 'catchable'>): void {
    const response = HttpErrorScenarioRunners.createResponse(scenarioCase);
    const error = new HTTPError(scenarioCase.input.url, response);

    try {
      throw error;
    } catch (caughtError) {
      assert.ok(caughtError instanceof HTTPError);
      assert.equal(caughtError.name, scenarioCase.expected.caughtName);
      assert.equal(caughtError.retryable, scenarioCase.expected.retryable);
      assert.equal(caughtError.status, scenarioCase.expected.status);
      assert.equal(caughtError.statusText, scenarioCase.expected.statusText);
      assert.equal(caughtError.url, scenarioCase.expected.url);
    }
  }

  static 'client-error'(scenarioCase: ScenarioCaseOfType<HttpErrorScenarioCaseEntity.Type, 'client-error'>): void {
    const response = HttpErrorScenarioRunners.createResponse(scenarioCase);
    const error = new HTTPError(scenarioCase.input.url, response);

    assert.ok(error instanceof HTTPError);
    assert.equal(error.name, 'HTTPError');
    assert.equal(error.code, scenarioCase.expected.code);
    assert.equal(error.url, scenarioCase.expected.url);
    assert.equal(error.status, scenarioCase.expected.status);
    assert.equal(error.statusText, scenarioCase.expected.statusText);
    assert.equal(error.retryable, scenarioCase.expected.retryable);
    assert.equal(error.response.status, response.status);
    assert.equal(error.message, scenarioCase.expected.message);
  }

  static 'response-properties'(scenarioCase: ScenarioCaseOfType<HttpErrorScenarioCaseEntity.Type, 'response-properties'>): void {
    const response = HttpErrorScenarioRunners.createResponse(scenarioCase);
    const error = new HTTPError(scenarioCase.input.url, response);

    assert.equal(error.response.url, scenarioCase.expected.responseUrl);
    assert.equal(error.status, scenarioCase.expected.status);
    assert.equal(error.statusText, scenarioCase.expected.statusText);
    assert.equal(error.url, scenarioCase.expected.url);
  }

  static 'server-error'(scenarioCase: ScenarioCaseOfType<HttpErrorScenarioCaseEntity.Type, 'server-error'>): void {
    const response = HttpErrorScenarioRunners.createResponse(scenarioCase);
    const error = new HTTPError(scenarioCase.input.url, response);

    assert.ok(error instanceof HTTPError);
    assert.equal(error.retryable, scenarioCase.expected.retryable);
    assert.equal(error.status, scenarioCase.expected.status);
    assert.equal(error.statusText, scenarioCase.expected.statusText);
    assert.equal(error.url, scenarioCase.expected.url);
    assert.equal(error.response.status, response.status);
    assert.equal(error.message, scenarioCase.expected.message);
  }

  private static createResponse(scenarioCase: HttpErrorScenarioCaseEntity.Type): Response {
    const response = new Response(scenarioCase.input.body, {
      'headers': { 'Content-Type': 'text/plain' },
      'status': scenarioCase.input.status,
      'statusText': scenarioCase.input.statusText
    });
    return response;
  }
}

ScenarioSuite.register({
  'entity': HttpErrorScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'fetch http error',
  'runners': HttpErrorScenarioRunners
});
