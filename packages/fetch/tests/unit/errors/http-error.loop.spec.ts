import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HTTPError } from '../../../src/errors/index.js';

import scenarioGroups from './http-error.scenarios.json';

type ScenarioCase =
  | {
      description: string;
      expected: { code: string; message: string; retryable: boolean; status: number; statusText: string; url: string };
      input: { body: string; status: number; statusText: string; url: string };
      kind: 'client-error';
      name: string;
    }
  | {
      description: string;
      expected: { code: string; message: string; retryable: boolean; status: number; statusText: string; url: string };
      input: { body: string; status: number; statusText: string; url: string };
      kind: 'server-error';
      name: string;
    }
  | {
      description: string;
      expected: { caughtName: 'HTTPError'; retryable: boolean; status: number; statusText: string; url: string };
      input: { body: string; status: number; statusText: string; url: string };
      kind: 'catchable';
      name: string;
    }
  | {
      description: string;
      expected: { responseUrl: string; status: number; statusText: string; url: string };
      input: { body: string; status: number; statusText: string; url: string };
      kind: 'response-properties';
      name: string;
    };

type ScenarioRunner<Kind extends ScenarioCase['kind']> = (scenarioCase: Extract<ScenarioCase, { kind: Kind }>) => void;
type RunnerMap = { [Kind in ScenarioCase['kind']]: ScenarioRunner<Kind> };

function createResponse(scenarioCase: ScenarioCase): Response {
  return new Response(scenarioCase.input.body, {
    headers: { 'Content-Type': 'text/plain' },
    status: scenarioCase.input.status,
    statusText: scenarioCase.input.statusText
  });
}

const runnerMap: RunnerMap = {
  'catchable': (scenarioCase) => {
    const response = createResponse(scenarioCase);
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
  },
  'client-error': (scenarioCase) => {
    const response = createResponse(scenarioCase);
    const error = new HTTPError(scenarioCase.input.url, response);

    assert.ok(error instanceof HTTPError);
    assert.equal(error.name, 'HTTPError');
    assert.equal(error.code, scenarioCase.expected.code);
    assert.equal(error.url, scenarioCase.expected.url);
    assert.equal(error.status, scenarioCase.expected.status);
    assert.equal(error.statusText, scenarioCase.expected.statusText);
    assert.equal(error.retryable, scenarioCase.expected.retryable);
    assert.equal(error.response, response);
    assert.equal(error.message, scenarioCase.expected.message);
  },
  'response-properties': (scenarioCase) => {
    const response = createResponse(scenarioCase);
    const error = new HTTPError(scenarioCase.input.url, response);

    assert.equal(error.response.url, scenarioCase.expected.responseUrl);
    assert.equal(error.status, scenarioCase.expected.status);
    assert.equal(error.statusText, scenarioCase.expected.statusText);
    assert.equal(error.url, scenarioCase.expected.url);
  },
  'server-error': (scenarioCase) => {
    const response = createResponse(scenarioCase);
    const error = new HTTPError(scenarioCase.input.url, response);

    assert.ok(error instanceof HTTPError);
    assert.equal(error.retryable, scenarioCase.expected.retryable);
    assert.equal(error.status, scenarioCase.expected.status);
    assert.equal(error.statusText, scenarioCase.expected.statusText);
    assert.equal(error.url, scenarioCase.expected.url);
    assert.equal(error.response, response);
    assert.equal(error.message, scenarioCase.expected.message);
  }
};

function runCase<Kind extends ScenarioCase['kind']>(scenarioCase: Extract<ScenarioCase, { kind: Kind }>): void {
  runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('fetch http error', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
