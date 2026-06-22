/**
 * Tests for socket-related error classes
 */

import type { SocketDispatcherStatsType } from '../../src/interfaces/SocketDispatcherStatsType.js';

import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { SocketExhaustionError } from '../../src/errors/index.js';

void describe('socket error classes', () => {
  void describe('SocketExhaustionError', () => {
    void it('should create error with url only', () => {
      const error = new SocketExhaustionError('https://api.example.com/data');

      assert.ok(error instanceof Error);
      assert.ok(error instanceof SocketExhaustionError);
      assert.equal(error.name, 'SocketExhaustionError');
      assert.equal(error.url, 'https://api.example.com/data');
      assert.ok(error.message.includes('https://api.example.com/data'));
      assert.ok(error.message.includes('Connection pool exhausted'));
      assert.equal(error.maxConnections, 0);
      assert.equal(error.freeConnections, 0);
      assert.equal(error.pendingRequests, 0);
      assert.equal(error.queuedRequests, 0);
      assert.equal(error.dispatcherStats, undefined);
    });

    void it('should create error with dispatcher stats', () => {
      const stats: SocketDispatcherStatsType = {
        connected: 20,
        free: 0,
        pending: 15,
        queued: 5,
        running: 20,
        size: 40
      };

      const error = new SocketExhaustionError(
        'https://api.example.com/data',
        stats
      );

      assert.equal(error.url, 'https://api.example.com/data');
      assert.equal(error.maxConnections, 20);
      assert.equal(error.freeConnections, 0);
      assert.equal(error.pendingRequests, 15);
      assert.equal(error.queuedRequests, 5);
      assert.ok(error.dispatcherStats !== undefined);
      assert.equal(error.dispatcherStats.connected, 20);
      assert.equal(error.dispatcherStats.free, 0);
      assert.equal(error.dispatcherStats.pending, 15);
      assert.equal(error.dispatcherStats.queued, 5);
      assert.equal(error.dispatcherStats.running, 20);
      assert.equal(error.dispatcherStats.size, 40);
    });

    void it('should include stats in error message', () => {
      const stats: SocketDispatcherStatsType = {
        connected: 10,
        free: 2,
        pending: 5,
        queued: 3,
        running: 8,
        size: 16
      };

      const error = new SocketExhaustionError('https://test.com/api', stats);

      assert.ok(error.dispatcherStats !== undefined);
      assert.equal(error.dispatcherStats.running, 8);
      assert.ok(error.message.includes('connected: 10'));
      assert.ok(error.message.includes('free: 2'));
      assert.ok(error.message.includes('pending: 5'));
      assert.ok(error.message.includes('queued: 3'));
      assert.ok(error.message.includes('increasing pool size'));
    });

    void it('should be catchable as Error', () => {
      const stats: SocketDispatcherStatsType = {
        connected: 5,
        free: 0,
        pending: 10,
        queued: 0,
        running: 5,
        size: 15
      };

      try {
        throw new SocketExhaustionError('https://test.com/api', stats);
      } catch (caughtError) {
        assert.ok(caughtError instanceof Error);
        assert.ok(caughtError instanceof SocketExhaustionError);
        assert.equal(caughtError.url, 'https://test.com/api');
      }
    });

    void it('should have correct property types', () => {
      const stats: SocketDispatcherStatsType = {
        connected: 15,
        free: 3,
        pending: 8,
        queued: 2,
        running: 12,
        size: 22
      };

      const error = new SocketExhaustionError('https://api.com/test', stats);

      assert.equal(typeof error.url, 'string');
      assert.equal(typeof error.maxConnections, 'number');
      assert.equal(typeof error.freeConnections, 'number');
      assert.equal(typeof error.pendingRequests, 'number');
      assert.equal(typeof error.queuedRequests, 'number');
      assert.equal(typeof error.dispatcherStats, 'object');
    });
  });

  void describe('error inheritance', () => {
    void it('should preserve error properties through throw/catch', () => {
      const stats: SocketDispatcherStatsType = {
        connected: 10,
        free: 0,
        pending: 5,
        queued: 0,
        running: 10,
        size: 15
      };

      try {
        throw new SocketExhaustionError('https://api.com/test', stats);
      } catch (caughtError) {
        assert.ok(caughtError instanceof SocketExhaustionError);
        const socketError = caughtError;

        assert.equal(socketError.url, 'https://api.com/test');
        assert.equal(socketError.maxConnections, 10);
        assert.equal(socketError.freeConnections, 0);
        assert.equal(socketError.pendingRequests, 5);
        assert.ok(socketError.dispatcherStats !== undefined);
      }
    });
  });
});
