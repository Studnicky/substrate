import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { AbortError, FetchClient, TimeoutError } from '../../../src/node/index.js';
import { FetchTestError } from '../../helpers/FetchTestError.js';
import { TestServer } from '../../helpers/test-server/TestServer.js';
import { ErrorsScenarioCaseEntity } from './entities/ErrorsScenarioCaseEntity.js';
import scenarioGroups from './errors.scenarios.json' with { 'type': 'json' };

class ErrorsRunners {
  private static readonly client = FetchClient.create();

  static async 'rejects'(scenarioCase: ScenarioCaseOfType<ErrorsScenarioCaseEntity.Type, 'rejects'>): Promise<void> {
    using server = TestServer.start();
    const url = ErrorsRunners.resolveUrl(scenarioCase.input.url, server.url);
    const options = ErrorsRunners.createOptions(scenarioCase.input);
    let caught: unknown;
    try {
      await ErrorsRunners.client.get(url, options);
    } catch (error) {
      caught = error;
    }
    assert.ok(caught instanceof Error, 'the request rejects with an error');
    ErrorsRunners.assertRejection(caught, scenarioCase.expected);
  }

  static async 'resolves'(scenarioCase: ScenarioCaseOfType<ErrorsScenarioCaseEntity.Type, 'resolves'>): Promise<void> {
    using server = TestServer.start();
    const url = ErrorsRunners.resolveUrl(scenarioCase.input.url, server.url);
    const options = ErrorsRunners.createOptions(scenarioCase.input);
    const response = await ErrorsRunners.client.get(url, options);
    assert.strictEqual(response.status, scenarioCase.expected.status);
    assert.strictEqual(response.ok, scenarioCase.expected.ok);
  }

  private static assertRejection(caught: Error, expected: ScenarioCaseOfType<ErrorsScenarioCaseEntity.Type, 'rejects'>['expected']): void {
    ErrorsRunners.assertErrorKind(caught, expected);
    if (expected.messageIncludes !== undefined) {
      for (let index = 0; index < expected.messageIncludes.length; index += 1) {
        assert.ok(caught.message.includes(expected.messageIncludes[index] ?? ''));
      }
    }

    if (expected.urlIncludes !== undefined) {
      assert.ok(caught.message.includes(expected.urlIncludes) || ('url' in caught && typeof caught.url === 'string' && caught.url.includes(expected.urlIncludes)));
    }
  }

  private static assertErrorKind(caught: Error, expected: ScenarioCaseOfType<ErrorsScenarioCaseEntity.Type, 'rejects'>['expected']): void {
    if (expected.error === 'TimeoutError') {
      assert.ok(caught instanceof TimeoutError);
      if (expected.timeoutMs !== undefined) {
        assert.strictEqual(caught.timeoutMs, expected.timeoutMs);
      }
    } else if (expected.error === 'AbortError') {
      assert.ok(caught instanceof AbortError);
    }
  }

  private static createOptions(input: { 'signal'?: 'abort-after-ms'; 'timeout'?: number }): { 'signal'?: AbortSignal; 'timeout'?: number } {
    const signal = ErrorsRunners.materializeSignal(input.signal);
    const options = {
      ...(input.timeout === undefined ? {} : { 'timeout': input.timeout }),
      ...(signal === undefined ? {} : { 'signal': signal })
    };
    return options;
  }

  private static materializeSignal(flag: 'abort-after-ms' | undefined): AbortSignal | undefined {
    if (flag === 'abort-after-ms') {
      const controller = new AbortController();
      setTimeout(() => {
        controller.abort(new FetchTestError('abort requested by the scenario'));
      }, 10);
      return controller.signal;
    }
    return undefined;
  }

  private static resolveUrl(requestUrl: string, serverUrl: string): string {
    const url = requestUrl.startsWith('http') ? requestUrl : `${serverUrl}${requestUrl}`;
    return url;
  }
}

ScenarioSuite.register({
  'entity': ErrorsScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Error Handling',
  'runners': ErrorsRunners
});
