import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { ConfigurationError } from '../../../src/errors/ConfigurationError.js';
import { FetchBaseError } from '../../../src/errors/FetchBaseError.js';
import { FetchTestError } from '../../helpers/FetchTestError.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { ScopedTestDispatcher } from '../../helpers/ScopedTestDispatcher.js';
import { TestDispatcherScenarioCaseEntity } from './entities/TestDispatcherScenarioCaseEntity.js';
import scenarioGroups from './TestDispatcher.scenarios.json' with { 'type': 'json' };

class TestDispatcherRunners {
  static async 'delete-post'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'delete-post'>): Promise<void> {
    await TestDispatcherRunners.runJsonRouteCase(scenarioCase);
  }

  static async 'enetunreach'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'enetunreach'>): Promise<void> {
    await TestDispatcherRunners.runNetworkErrorCase(scenarioCase);
  }

  static async 'enotfound'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'enotfound'>): Promise<void> {
    await TestDispatcherRunners.runNetworkErrorCase(scenarioCase);
  }

  static async 'head-post'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'head-post'>): Promise<void> {
    await TestDispatcherRunners.runHeadRouteCase(scenarioCase);
  }

  static async 'invalid-protocol'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'invalid-protocol'>): Promise<void> {
    await TestDispatcherRunners.runNetworkErrorCase(scenarioCase);
  }

  static async 'not-found'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'not-found'>): Promise<void> {
    await TestDispatcherRunners.runJsonRouteCase(scenarioCase);
  }

  static async 'ok'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'ok'>): Promise<void> {
    await TestDispatcherRunners.runTextCase(scenarioCase);
  }

  static async 'patch-post'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'patch-post'>): Promise<void> {
    await TestDispatcherRunners.runJsonRouteCase(scenarioCase);
  }

  static async 'post-arraybuffer'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'post-arraybuffer'>): Promise<void> {
    await TestDispatcherRunners.runBodyEchoCase(scenarioCase, new Uint8Array(scenarioCase.input.bodyBuffer ?? []).buffer);
  }

  static async 'post-blob'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'post-blob'>): Promise<void> {
    await TestDispatcherRunners.runBlobCase(scenarioCase);
  }

  static async 'post-dataview'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'post-dataview'>): Promise<void> {
    await TestDispatcherRunners.runBodyEchoCase(scenarioCase, new DataView(new Uint8Array(scenarioCase.input.bodyBuffer ?? []).buffer));
  }

  static async 'post-echo'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'post-echo'>): Promise<void> {
    await TestDispatcherRunners.runJsonRouteCase(scenarioCase);
  }

  static async 'post-posts'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'post-posts'>): Promise<void> {
    await TestDispatcherRunners.runJsonRouteCase(scenarioCase);
  }

  static async 'post-string'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'post-string'>): Promise<void> {
    await TestDispatcherRunners.runBodyEchoCase(scenarioCase, scenarioCase.input.body ?? '');
  }

  static async 'post-uint8array'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'post-uint8array'>): Promise<void> {
    await TestDispatcherRunners.runBodyEchoCase(scenarioCase, new Uint8Array(scenarioCase.input.bodyBuffer ?? []));
  }

  static async 'put-post'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'put-post'>): Promise<void> {
    await TestDispatcherRunners.runJsonRouteCase(scenarioCase);
  }

  static async 'queued-request-aborts-before-dispatch'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'queued-request-aborts-before-dispatch'>): Promise<void> {
    await TestDispatcherRunners.runQueuedAbortCase(scenarioCase);
  }

  static async 'signal-aborted-before-wait'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'signal-aborted-before-wait'>): Promise<void> {
    await TestDispatcherRunners.runSignalAbortedCase(scenarioCase);
  }

  static async 'text-response'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'text-response'>): Promise<void> {
    await TestDispatcherRunners.runTextCase(scenarioCase);
  }

  static async 'url-echo'(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'url-echo'>): Promise<void> {
    await TestDispatcherRunners.runJsonRouteCase(scenarioCase);
  }

  private static async runBlobCase(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'post-blob'>): Promise<void> {
    await using scoped = ScopedTestDispatcher.create(scenarioCase.input.testDispatcher);
    const init = { ...scenarioCase.input.init, 'body': new Blob([scenarioCase.input.body ?? '']) };
    const caught = await RejectionProbe.capture(async () => {
      await scoped.dispatcher.fetch(scenarioCase.input.url, init);
    });
    assert.ok(caught instanceof ConfigurationError);
    assert.strictEqual(caught.code, scenarioCase.expected.errorCode);
    assert.strictEqual(caught.message, scenarioCase.expected.errorMessage);
  }

  private static async runBodyEchoCase(
    scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'post-arraybuffer' | 'post-dataview' | 'post-string' | 'post-uint8array'>,
    body: ArrayBuffer | DataView | string | Uint8Array
  ): Promise<void> {
    await using scoped = ScopedTestDispatcher.create(scenarioCase.input.testDispatcher);
    const init = { ...scenarioCase.input.init, 'body': body };
    const response = await scoped.dispatcher.fetch(scenarioCase.input.url, init);
    assert.strictEqual(response.status, scenarioCase.expected.status);
    const json: unknown = await response.json();
    assert.deepStrictEqual(json, scenarioCase.expected.body);
  }

  private static async runHeadRouteCase(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'head-post'>): Promise<void> {
    await using scoped = ScopedTestDispatcher.create(scenarioCase.input.testDispatcher);
    const response = await scoped.dispatcher.fetch(scenarioCase.input.url, scenarioCase.input.init ?? {});
    assert.strictEqual(response.status, scenarioCase.expected.status);
    assert.strictEqual(await response.text(), '');
  }

  private static async runJsonRouteCase(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'delete-post' | 'not-found' | 'patch-post' | 'post-echo' | 'post-posts' | 'put-post' | 'url-echo'>): Promise<void> {
    await using scoped = ScopedTestDispatcher.create(scenarioCase.input.testDispatcher);
    const response = await scoped.dispatcher.fetch(scenarioCase.input.url, 'init' in scenarioCase.input ? scenarioCase.input.init : {});
    assert.strictEqual(response.status, scenarioCase.expected.status);
    const json: unknown = await response.json();
    assert.deepStrictEqual(json, scenarioCase.expected.body);
  }

  private static async runNetworkErrorCase(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'enetunreach' | 'enotfound' | 'invalid-protocol'>): Promise<void> {
    await using scoped = ScopedTestDispatcher.create(scenarioCase.input.testDispatcher);
    const caught = await RejectionProbe.capture(async () => {
      await scoped.dispatcher.fetch(scenarioCase.input.url, {});
    });
    assert.ok(caught instanceof Error);
    assert.strictEqual(Reflect.get(caught, 'code'), scenarioCase.expected.errorCode);
    assert.strictEqual(caught.message, scenarioCase.expected.errorMessage);
  }

  private static async runQueuedAbortCase(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'queued-request-aborts-before-dispatch'>): Promise<void> {
    await using scoped = ScopedTestDispatcher.create(scenarioCase.input.testDispatcher);
    const { dispatcher } = scoped;
    const longRequest = dispatcher.fetch(scenarioCase.input.longUrl, {});
    const controller = new AbortController();
    const queuedRequest = dispatcher.fetch(scenarioCase.input.queuedUrl, { 'signal': controller.signal });
    const queuedOutcome = RejectionProbe.capture(async () => {
      await queuedRequest;
    });

    setTimeout(() => {
      controller.abort(new FetchTestError('the queued request is aborted before it reaches dispatch'));
    }, scenarioCase.input.abortAfterMs);

    const longResponse = await longRequest;
    assert.strictEqual(longResponse.status, scenarioCase.expected.longStatus);
    const caught = await queuedOutcome;
    assert.ok(caught instanceof FetchBaseError);
    assert.strictEqual(caught.name, scenarioCase.expected.queuedErrorName);
    assert.strictEqual(caught.message, scenarioCase.expected.queuedErrorMessage);

    const stats = dispatcher.getStats();
    assert.ok(stats.has(scenarioCase.expected.origin));
    assert.deepStrictEqual(
      stats.get(scenarioCase.expected.origin),
      scenarioCase.expected.stats
    );
  }

  private static async runSignalAbortedCase(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'signal-aborted-before-wait'>): Promise<void> {
    await using scoped = ScopedTestDispatcher.create(scenarioCase.input.testDispatcher);
    const controller = new AbortController();
    controller.abort(new FetchTestError('the signal is aborted before the request waits'));
    const caught = await RejectionProbe.capture(async () => {
      await scoped.dispatcher.fetch(scenarioCase.input.url, { 'signal': controller.signal });
    });
    assert.ok(caught instanceof FetchBaseError);
    assert.strictEqual(caught.name, scenarioCase.expected.queuedErrorName);
    assert.strictEqual(caught.message, scenarioCase.expected.queuedErrorMessage);
  }

  private static async runTextCase(scenarioCase: ScenarioCaseOfType<TestDispatcherScenarioCaseEntity.Type, 'ok' | 'text-response'>): Promise<void> {
    await using scoped = ScopedTestDispatcher.create(scenarioCase.input.testDispatcher);
    const response = await scoped.dispatcher.fetch(scenarioCase.input.url, {});
    assert.strictEqual(response.status, scenarioCase.expected.status);
    const body = await response.text();
    assert.strictEqual(body, scenarioCase.expected.body);
  }
}

ScenarioSuite.register({
  'entity': TestDispatcherScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'fetch test dispatcher',
  'runners': TestDispatcherRunners
});
