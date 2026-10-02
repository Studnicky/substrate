import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import {
  BodyTimeoutError,
  ConnectTimeoutError,
  FetchClient,
  HeadersTimeoutError,
  SocketError,
  SocketExhaustionError
} from '../../../src/node/index.js';
import { FetchClientInternals } from '../../helpers/FetchClientInternals.js';
import { PlatformErrors } from '../../helpers/PlatformErrors.js';
import { ErrorWrappingScenarioCaseEntity } from './entities/ErrorWrappingScenarioCaseEntity.js';
import scenarioGroups from './error-wrapping.scenarios.json' with { 'type': 'json' };

class ErrorWrappingRunners {
  static async 'handle-dispatcher-health'(scenarioCase: ScenarioCaseOfType<ErrorWrappingScenarioCaseEntity.Type, 'handle-dispatcher-health'>): Promise<void> {
    const client = FetchClient.create(scenarioCase.input.fetchClient);
    FetchClientInternals.stubDispatcherHealth(client);
    const wrapped = await FetchClientInternals.handleSocketExhaustion(client, scenarioCase.input.url, scenarioCase.input.errorCode ?? 'UND_ERR_CONNECT_TIMEOUT');
    assert.ok(wrapped instanceof SocketExhaustionError);
    assert.equal(ErrorWrappingRunners.describeShape(wrapped), scenarioCase.expected.shape);
  }

  static async 'handle-invalid-origin'(scenarioCase: ScenarioCaseOfType<ErrorWrappingScenarioCaseEntity.Type, 'handle-invalid-origin'>): Promise<void> {
    const client = FetchClient.create(scenarioCase.input.fetchClient);
    const wrapped = await FetchClientInternals.handleSocketExhaustion(client, scenarioCase.input.url, scenarioCase.input.errorCode ?? 'UND_ERR_CONNECT_TIMEOUT');
    assert.ok(wrapped === undefined);
    assert.equal(ErrorWrappingRunners.describeShape(wrapped), scenarioCase.expected.shape);
  }

  static async 'handle-no-dispatcher'(scenarioCase: ScenarioCaseOfType<ErrorWrappingScenarioCaseEntity.Type, 'handle-no-dispatcher'>): Promise<void> {
    const client = FetchClient.create(scenarioCase.input.fetchClient);
    const wrapped = await FetchClientInternals.handleSocketExhaustion(client, scenarioCase.input.url, scenarioCase.input.errorCode ?? 'UND_ERR_CONNECT_TIMEOUT');
    assert.ok(wrapped === undefined);
    assert.equal(ErrorWrappingRunners.describeShape(wrapped), scenarioCase.expected.shape);
  }

  static async 'wrap-body-timeout'(scenarioCase: ScenarioCaseOfType<ErrorWrappingScenarioCaseEntity.Type, 'wrap-body-timeout'>): Promise<void> {
    const wrapped = await ErrorWrappingRunners.wrapMapped(scenarioCase);
    assert.ok(wrapped instanceof BodyTimeoutError);
    assert.equal(wrapped.name, scenarioCase.expected.errorName);
    assert.equal(ErrorWrappingRunners.describeShape(wrapped), scenarioCase.expected.shape);
  }

  static async 'wrap-connect-timeout'(scenarioCase: ScenarioCaseOfType<ErrorWrappingScenarioCaseEntity.Type, 'wrap-connect-timeout'>): Promise<void> {
    const wrapped = await ErrorWrappingRunners.wrapMapped(scenarioCase);
    assert.ok(wrapped instanceof ConnectTimeoutError);
    assert.equal(wrapped.name, scenarioCase.expected.errorName);
    assert.equal(ErrorWrappingRunners.describeShape(wrapped), scenarioCase.expected.shape);
  }

  static async 'wrap-headers-timeout'(scenarioCase: ScenarioCaseOfType<ErrorWrappingScenarioCaseEntity.Type, 'wrap-headers-timeout'>): Promise<void> {
    const wrapped = await ErrorWrappingRunners.wrapMapped(scenarioCase);
    assert.ok(wrapped instanceof HeadersTimeoutError);
    assert.equal(wrapped.name, scenarioCase.expected.errorName);
    assert.equal(ErrorWrappingRunners.describeShape(wrapped), scenarioCase.expected.shape);
  }

  static async 'wrap-no-code'(scenarioCase: ScenarioCaseOfType<ErrorWrappingScenarioCaseEntity.Type, 'wrap-no-code'>): Promise<void> {
    const client = FetchClient.create(scenarioCase.input.fetchClient);
    const wrapped = await FetchClientInternals.wrapUndiciError(client, PlatformErrors.create(), scenarioCase.input.url);
    assert.ok(wrapped === undefined);
    assert.equal(ErrorWrappingRunners.describeShape(wrapped), scenarioCase.expected.shape);
  }

  static async 'wrap-socket-error'(scenarioCase: ScenarioCaseOfType<ErrorWrappingScenarioCaseEntity.Type, 'wrap-socket-error'>): Promise<void> {
    const wrapped = await ErrorWrappingRunners.wrapMapped(scenarioCase);
    assert.ok(wrapped instanceof SocketError);
    assert.equal(wrapped.name, scenarioCase.expected.errorName);
    assert.equal(ErrorWrappingRunners.describeShape(wrapped), scenarioCase.expected.shape);
  }

  static async 'wrap-unknown-code'(scenarioCase: ScenarioCaseOfType<ErrorWrappingScenarioCaseEntity.Type, 'wrap-unknown-code'>): Promise<void> {
    const client = FetchClient.create(scenarioCase.input.fetchClient);
    const wrapped = await FetchClientInternals.wrapUndiciError(client, PlatformErrors.create(scenarioCase.input.errorCode), scenarioCase.input.url);
    assert.ok(wrapped === undefined);
    assert.equal(ErrorWrappingRunners.describeShape(wrapped), scenarioCase.expected.shape);
  }

  /** Categorizes a wrapped result the same way `expected.shape` describes it in the scenario data. */
  private static describeShape(wrapped: Error | undefined): 'error' | 'socket-exhaustion' | 'undefined' {
    if (wrapped === undefined) {
      return 'undefined';
    }
    if (wrapped instanceof SocketExhaustionError) {
      return 'socket-exhaustion';
    }
    return 'error';
  }

  private static async wrapMapped(
    scenarioCase: ScenarioCaseOfType<ErrorWrappingScenarioCaseEntity.Type, 'wrap-body-timeout' | 'wrap-connect-timeout' | 'wrap-headers-timeout' | 'wrap-socket-error'>
  ): Promise<unknown> {
    assert.equal(scenarioCase.expected.shape, 'error', `Expected error-shaped expectation for ${scenarioCase.name}`);
    const client = FetchClient.create(scenarioCase.input.fetchClient);
    FetchClientInternals.stubDispatcherHealth(client);
    const wrapped = await FetchClientInternals.wrapUndiciError(client, PlatformErrors.create(scenarioCase.input.errorCode), scenarioCase.input.url);
    return wrapped;
  }
}

ScenarioSuite.register({
  'entity': ErrorWrappingScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'fetch error wrapping',
  'runners': ErrorWrappingRunners
});
