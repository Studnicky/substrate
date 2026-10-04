import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { SocketExhaustionError } from '../../src/errors/index.js';
import { RejectionProbe } from '../helpers/RejectionProbe.js';
import { SocketErrorsScenarioCaseEntity } from './entities/SocketErrorsScenarioCaseEntity.js';
import scenarioGroups from './socket-errors.scenarios.json' with { 'type': 'json' };

class SocketErrorsRunners {
  static 'catchable'(scenarioCase: ScenarioCaseOfType<SocketErrorsScenarioCaseEntity.Type, 'catchable'>): void {
    const caughtError = RejectionProbe.captureSync(() => {
      throw new SocketExhaustionError(scenarioCase.input.url, scenarioCase.input.stats);
    });
    assert.ok(caughtError instanceof Error);
    assert.ok(caughtError instanceof SocketExhaustionError);
    assert.equal(caughtError.name, scenarioCase.expected.caughtName);
    assert.equal(caughtError.url, scenarioCase.expected.url);
  }

  static 'message-includes-stats'(scenarioCase: ScenarioCaseOfType<SocketErrorsScenarioCaseEntity.Type, 'message-includes-stats'>): void {
    const error = new SocketExhaustionError(scenarioCase.input.url, scenarioCase.input.stats);
    assert.ok(error.dispatcherStats !== undefined);
    const fragments = scenarioCase.expected.messageIncludes;
    for (let index = 0; index < fragments.length; index += 1) {
      assert.ok(error.message.includes(fragments[index] ?? ''));
    }
  }

  static 'preserve-through-throw'(scenarioCase: ScenarioCaseOfType<SocketErrorsScenarioCaseEntity.Type, 'preserve-through-throw'>): void {
    const caughtError = RejectionProbe.captureSync(() => {
      throw new SocketExhaustionError(scenarioCase.input.url, scenarioCase.input.stats);
    });
    assert.ok(caughtError instanceof SocketExhaustionError);
    const socketError = caughtError;
    assert.equal(socketError.url, scenarioCase.expected.url);
    assert.equal(socketError.maximumConnections, scenarioCase.expected.maximumConnections);
    assert.equal(socketError.freeConnections, scenarioCase.expected.freeConnections);
    assert.equal(socketError.pendingRequests, scenarioCase.expected.pendingRequests);
    assert.ok(socketError.dispatcherStats !== undefined);
    assert.equal(scenarioCase.expected.dispatcherStatsDefined, true);
  }

  static 'property-types'(scenarioCase: ScenarioCaseOfType<SocketErrorsScenarioCaseEntity.Type, 'property-types'>): void {
    const error = new SocketExhaustionError(scenarioCase.input.url, scenarioCase.input.stats);
    assert.equal(typeof error.url, scenarioCase.expected.urlType);
    assert.equal(typeof error.maximumConnections, scenarioCase.expected.maximumConnectionsType);
    assert.equal(typeof error.freeConnections, scenarioCase.expected.freeConnectionsType);
    assert.equal(typeof error.pendingRequests, scenarioCase.expected.pendingRequestsType);
    assert.equal(typeof error.queuedRequests, scenarioCase.expected.queuedRequestsType);
    assert.equal(typeof error.dispatcherStats, scenarioCase.expected.dispatcherStatsType);
  }

  static 'url-only'(scenarioCase: ScenarioCaseOfType<SocketErrorsScenarioCaseEntity.Type, 'url-only'>): void {
    const error = new SocketExhaustionError(scenarioCase.input.url);
    assert.ok(error instanceof Error);
    assert.ok(error instanceof SocketExhaustionError);
    assert.equal(error.name, 'SocketExhaustionError');
    assert.equal(error.url, scenarioCase.expected.url);
    assert.ok(error.message.includes(error.url));
    assert.ok(error.message.includes('Connection pool exhausted'));
    assert.equal(error.maximumConnections, scenarioCase.expected.maximumConnections);
    assert.equal(error.freeConnections, 0);
    assert.equal(error.pendingRequests, scenarioCase.expected.pendingRequests);
    assert.equal(error.queuedRequests, scenarioCase.expected.queuedRequests);
    assert.equal(error.dispatcherStats, undefined);
  }

  static 'with-stats'(scenarioCase: ScenarioCaseOfType<SocketErrorsScenarioCaseEntity.Type, 'with-stats'>): void {
    const error = new SocketExhaustionError(scenarioCase.input.url, scenarioCase.input.stats);
    assert.equal(error.url, scenarioCase.expected.url);
    assert.equal(error.maximumConnections, scenarioCase.expected.maximumConnections);
    assert.equal(error.freeConnections, 0);
    assert.equal(error.pendingRequests, scenarioCase.expected.pendingRequests);
    assert.equal(error.queuedRequests, scenarioCase.expected.queuedRequests);
    assert.ok(error.dispatcherStats !== undefined);
    assert.deepStrictEqual(error.dispatcherStats, scenarioCase.expected.dispatcherStats);
  }
}

ScenarioSuite.register({
  'entity': SocketErrorsScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'socket error classes',
  'runners': SocketErrorsRunners
});
