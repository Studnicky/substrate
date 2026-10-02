import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import type { ClientConfigInterface } from '../../../src/interfaces/ClientConfigInterface.js';
import type { FetchOptionsInterface } from '../../../src/interfaces/FetchOptionsInterface.js';
import type { BoundedJsonValueEntity } from '../../helpers/entities/BoundedJsonValueEntity.js';

import { FetchClientConfiguration } from '../../../src/modules/FetchClientConfiguration.js';
import { FetchClient, TimeoutError } from '../../../src/node/index.js';
import { FetchTestError } from '../../helpers/FetchTestError.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { RuntimeValueMaterializer } from '../../helpers/RuntimeValueMaterializer.js';
import { TestServer } from '../../helpers/test-server/TestServer.js';
import { TimeoutErrorsScenarioCaseEntity } from './entities/TimeoutErrorsScenarioCaseEntity.js';
import scenarioGroups from './timeout.errors.scenarios.json' with { 'type': 'json' };

class TimeoutErrorsRunners {
  static 'create-ok'(scenarioCase: ScenarioCaseOfType<TimeoutErrorsScenarioCaseEntity.Type, 'create-ok'>): void {
    using server = TestServer.start();
    const config = TimeoutErrorsRunners.createConfig(scenarioCase.input.clientConfig, server.url);
    assert.doesNotThrow(() => {
      FetchClientConfiguration.intake(config);
    });
  }

  static 'create-throws'(scenarioCase: ScenarioCaseOfType<TimeoutErrorsScenarioCaseEntity.Type, 'create-throws'>): void {
    using server = TestServer.start();
    const config = TimeoutErrorsRunners.createConfig(scenarioCase.input.clientConfig, server.url);
    const caught = RejectionProbe.captureSync(() => {
      const result = FetchClientConfiguration.intake(config);
      return result;
    });
    assert.ok(caught instanceof Error);
    TimeoutErrorsRunners.assertMessageIncludes(caught, scenarioCase.expected.messageIncludes);
  }

  static async 'parallel'(scenarioCase: ScenarioCaseOfType<TimeoutErrorsScenarioCaseEntity.Type, 'parallel'>): Promise<void> {
    using server = TestServer.start();
    const clientInstance = TimeoutErrorsRunners.createClient(scenarioCase.input.clientConfig, server.url);
    const { steps } = scenarioCase.expected;
    const pending: Promise<Response>[] = [];
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      if (step !== undefined) {
        pending.push(TimeoutErrorsRunners.invoke(clientInstance, step.request, server.url));
      }
    }
    const settled = await Promise.allSettled(pending);
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      const outcome = settled[index];
      if (step !== undefined && outcome !== undefined) {
        TimeoutErrorsRunners.assertOutcome(outcome, step.expect);
      }
    }
  }

  static async 'rejects'(scenarioCase: ScenarioCaseOfType<TimeoutErrorsScenarioCaseEntity.Type, 'rejects'>): Promise<void> {
    using server = TestServer.start();
    const clientInstance = TimeoutErrorsRunners.createClient(scenarioCase.input.clientConfig, server.url);
    const caught = await RejectionProbe.capture(async () => {
      await TimeoutErrorsRunners.invoke(clientInstance, scenarioCase.input.request, server.url);
    });
    assert.ok(caught instanceof Error);
    TimeoutErrorsRunners.assertRejected(caught, scenarioCase.expected);
  }

  static async 'sequence'(scenarioCase: ScenarioCaseOfType<TimeoutErrorsScenarioCaseEntity.Type, 'sequence'>): Promise<void> {
    using server = TestServer.start();
    const clientInstance = TimeoutErrorsRunners.createClient(scenarioCase.input.clientConfig, server.url);
    const { steps } = scenarioCase.expected;
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      if (step !== undefined) {
        const settled = await Promise.allSettled([TimeoutErrorsRunners.invoke(clientInstance, step.request, server.url)]);
        const outcome = settled[0];
        assert.ok(outcome !== undefined, 'the request settles');
        TimeoutErrorsRunners.assertOutcome(outcome, step.expect);
      }
    }
  }

  static async 'status'(scenarioCase: ScenarioCaseOfType<TimeoutErrorsScenarioCaseEntity.Type, 'status'>): Promise<void> {
    using server = TestServer.start();
    const clientInstance = TimeoutErrorsRunners.createClient(scenarioCase.input.clientConfig, server.url);
    const response = await TimeoutErrorsRunners.invoke(clientInstance, scenarioCase.input.request, server.url);
    assert.strictEqual(response.status, scenarioCase.expected.status);
  }

  private static assertMessageIncludes(error: Error, fragments: readonly string[] | undefined): void {
    const expectedFragments = fragments ?? [];
    for (let index = 0; index < expectedFragments.length; index += 1) {
      assert.ok(error.message.toLowerCase().includes((expectedFragments[index] ?? '').toLowerCase()));
    }
  }

  private static assertOutcome(
    settled: PromiseSettledResult<Response>,
    expectation: ScenarioCaseOfType<TimeoutErrorsScenarioCaseEntity.Type, 'sequence'>['expected']['steps'][number]['expect']
  ): void {
    if (expectation.shape === 'status') {
      const detail = settled.status === 'rejected' ? String(settled.reason) : 'response';
      assert.ok(settled.status === 'fulfilled', `expected successful response, received ${detail}`);
      assert.strictEqual(settled.value.status, expectation.status);
      return;
    }

    assert.ok(settled.status === 'rejected', 'expected request rejection');
    const reason: unknown = settled.reason;
    assert.ok(reason instanceof Error);
    TimeoutErrorsRunners.assertRejected(reason, expectation);
  }

  private static assertRejected(error: Error, expectation: ScenarioCaseOfType<TimeoutErrorsScenarioCaseEntity.Type, 'rejects'>['expected']): void {
    if (expectation.error === 'TimeoutError') {
      assert.ok(error instanceof TimeoutError);
      assert.strictEqual(error.name, 'TimeoutError');
      if (expectation.timeoutMs !== undefined) {
        assert.strictEqual(error.timeoutMs, expectation.timeoutMs);
      }
    } else if (expectation.error === 'AbortError') {
      assert.strictEqual(error.name, 'AbortError');
    } else {
      assert.ok(error.name.includes('Error'));
    }

    TimeoutErrorsRunners.assertMessageIncludes(error, expectation.messageIncludes);

    if (expectation.urlIncludes !== undefined && 'url' in error && typeof error.url === 'string') {
      assert.ok(error.url.includes(expectation.urlIncludes));
    }
  }

  private static createClient(
    clientConfig: ScenarioCaseOfType<TimeoutErrorsScenarioCaseEntity.Type, 'status'>['input']['clientConfig'],
    serverUrl: string
  ): FetchClient {
    const timeout = TimeoutErrorsRunners.materializeTimeout(clientConfig?.timeout, serverUrl);
    const baseURL = clientConfig?.baseURL;
    const config: ClientConfigInterface = {
      ...(baseURL === undefined ? {} : { 'baseURL': baseURL.replaceAll('__TEST_URL__', serverUrl) }),
      ...(timeout === undefined ? {} : { 'timeout': timeout })
    };
    const clientInstance = FetchClient.create(config);
    return clientInstance;
  }

  private static createConfig(
    clientConfig: ScenarioCaseOfType<TimeoutErrorsScenarioCaseEntity.Type, 'create-ok'>['input']['clientConfig'],
    serverUrl: string
  ): { 'baseURL'?: string; 'timeout'?: unknown } {
    const baseURL = clientConfig?.baseURL;
    const timeout = clientConfig?.timeout;
    const config = {
      ...(baseURL === undefined ? {} : { 'baseURL': baseURL }),
      ...(timeout === undefined ? {} : { 'timeout': RuntimeValueMaterializer.materializeWithServer(timeout, serverUrl) })
    };
    return config;
  }

  private static async invoke(
    clientInstance: FetchClient,
    request: ScenarioCaseOfType<TimeoutErrorsScenarioCaseEntity.Type, 'status'>['input']['request'],
    serverUrl: string
  ): Promise<Response> {
    const signal = TimeoutErrorsRunners.materializeSignal(request.signal);
    const timeout = TimeoutErrorsRunners.materializeTimeout(request.timeout, serverUrl);
    const options: FetchOptionsInterface = {
      ...(timeout === undefined ? {} : { 'timeout': timeout }),
      ...(signal === undefined ? {} : { 'signal': signal })
    };
    const response = await clientInstance.get(request.url.replaceAll('__TEST_URL__', serverUrl), options);
    return response;
  }

  private static materializeSignal(
    signal: ScenarioCaseOfType<TimeoutErrorsScenarioCaseEntity.Type, 'status'>['input']['request']['signal']
  ): AbortSignal | undefined {
    if (signal === undefined) {
      return undefined;
    }

    const controller = new AbortController();
    if (signal.shape === 'already-aborted') {
      controller.abort(new FetchTestError('the signal is aborted before the request starts'));
      return controller.signal;
    }

    setTimeout(() => {
      controller.abort(new FetchTestError('the signal aborts while the request is in flight'));
    }, signal.delayMs);
    return controller.signal;
  }

  private static materializeTimeout(value: BoundedJsonValueEntity.Type | undefined, serverUrl: string): number | undefined {
    if (value === undefined) {
      return undefined;
    }
    const materialized = RuntimeValueMaterializer.materializeWithServer(value, serverUrl);
    assert.ok(typeof materialized === 'number', 'timeout materializes to a number for a live FetchClient');
    return materialized;
  }
}

ScenarioSuite.register({
  'entity': TimeoutErrorsScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Timeout Error Scenarios',
  'runners': TimeoutErrorsRunners
});
