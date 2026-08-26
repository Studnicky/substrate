import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SocketExhaustionError } from '../../src/errors/index.js';
import type { SocketDispatcherStatsEntity } from '../../src/entities/SocketDispatcherStatsEntity.js';
import scenarioGroups from './socket-errors.scenarios.json' with { type: 'json' };

type SocketDispatcherStatsType = SocketDispatcherStatsEntity.Type;

type ScenarioCase =
  | {
      description: string;
      expected: { dispatcherStats: undefined; maximumConnections: number; pendingRequests: number; queuedRequests: number; url: string };
      input: { stats?: SocketDispatcherStatsType; url: string };
      shape: 'url-only';
      name: string;
    }
  | {
      description: string;
      expected: { dispatcherStats: SocketDispatcherStatsType; maximumConnections: number; pendingRequests: number; queuedRequests: number; url: string };
      input: { stats: SocketDispatcherStatsType; url: string };
      shape: 'with-stats';
      name: string;
    }
  | {
      description: string;
      expected: { messageIncludes: string[] };
      input: { stats: SocketDispatcherStatsType; url: string };
      shape: 'message-includes-stats';
      name: string;
    }
  | {
      description: string;
      expected: { caughtName: 'SocketExhaustionError'; url: string };
      input: { stats: SocketDispatcherStatsType; url: string };
      shape: 'catchable';
      name: string;
    }
  | {
      description: string;
      expected: { dispatcherStatsType: 'object'; freeConnectionsType: 'number'; maximumConnectionsType: 'number'; pendingRequestsType: 'number'; queuedRequestsType: 'number'; urlType: 'string' };
      input: { stats: SocketDispatcherStatsType; url: string };
      shape: 'property-types';
      name: string;
    }
  | {
      description: string;
      expected: { dispatcherStatsDefined: true; freeConnections: number; maximumConnections: number; pendingRequests: number; url: string };
      input: { stats: SocketDispatcherStatsType; url: string };
      shape: 'preserve-through-throw';
      name: string;
    };

type ScenarioRunner<Shape extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: Shape }>) => void;
type RunnerMap = { [Shape in ScenarioCase['shape']]: ScenarioRunner<Shape> };

const runnerMap: RunnerMap = {
  'url-only': (scenarioCase) => {
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
  },
  'with-stats': (scenarioCase) => {
    const error = new SocketExhaustionError(scenarioCase.input.url, scenarioCase.input.stats);
    assert.equal(error.url, scenarioCase.expected.url);
    assert.equal(error.maximumConnections, scenarioCase.expected.maximumConnections);
    assert.equal(error.freeConnections, 0);
    assert.equal(error.pendingRequests, scenarioCase.expected.pendingRequests);
    assert.equal(error.queuedRequests, scenarioCase.expected.queuedRequests);
    assert.ok(error.dispatcherStats !== undefined);
    assert.deepStrictEqual(error.dispatcherStats, scenarioCase.expected.dispatcherStats);
  },
  'message-includes-stats': (scenarioCase) => {
    const error = new SocketExhaustionError(scenarioCase.input.url, scenarioCase.input.stats);
    assert.ok(error.dispatcherStats !== undefined);
    for (const fragment of scenarioCase.expected.messageIncludes) {
      assert.ok(error.message.includes(fragment));
    }
  },
  catchable: (scenarioCase) => {
    try {
      throw new SocketExhaustionError(scenarioCase.input.url, scenarioCase.input.stats);
    } catch (caughtError) {
      assert.ok(caughtError instanceof Error);
      assert.ok(caughtError instanceof SocketExhaustionError);
      assert.equal(caughtError.name, scenarioCase.expected.caughtName);
      assert.equal(caughtError.url, scenarioCase.expected.url);
    }
  },
  'property-types': (scenarioCase) => {
    const error = new SocketExhaustionError(scenarioCase.input.url, scenarioCase.input.stats);
    assert.equal(typeof error.url, scenarioCase.expected.urlType);
    assert.equal(typeof error.maximumConnections, scenarioCase.expected.maximumConnectionsType);
    assert.equal(typeof error.freeConnections, scenarioCase.expected.freeConnectionsType);
    assert.equal(typeof error.pendingRequests, scenarioCase.expected.pendingRequestsType);
    assert.equal(typeof error.queuedRequests, scenarioCase.expected.queuedRequestsType);
    assert.equal(typeof error.dispatcherStats, scenarioCase.expected.dispatcherStatsType);
  },
  'preserve-through-throw': (scenarioCase) => {
    try {
      throw new SocketExhaustionError(scenarioCase.input.url, scenarioCase.input.stats);
    } catch (caughtError) {
      assert.ok(caughtError instanceof SocketExhaustionError);
      const socketError = caughtError;
      assert.equal(socketError.url, scenarioCase.expected.url);
      assert.equal(socketError.maximumConnections, scenarioCase.expected.maximumConnections);
      assert.equal(socketError.freeConnections, scenarioCase.expected.freeConnections);
      assert.equal(socketError.pendingRequests, scenarioCase.expected.pendingRequests);
      assert.ok(socketError.dispatcherStats !== undefined);
      assert.equal(scenarioCase.expected.dispatcherStatsDefined, true);
    }
  }
};

async function runCase<Shape extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: Shape }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('socket error classes', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
