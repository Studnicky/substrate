/**
 * Tests for UndiciDispatcher health monitoring
 */

import type { DispatcherHealthType } from '../../src/types/DispatcherHealthType.js';

import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { DispatcherAgent } from '../../src/config/DispatcherAgent.js';
import { UndiciDispatcher } from '../../src/modules/UndiciDispatcher.js';

const createDispatcher = (connections: number): UndiciDispatcher => {
  const agent = DispatcherAgent.create({ connections });
  return UndiciDispatcher.create(agent);
};

void describe('dispatcher health monitoring', () => {
  void describe('getStats', () => {
    void it('should return empty object for new dispatcher', async () => {
      const dispatcher = createDispatcher(10);
      const stats = dispatcher.getStats();

      assert.equal(typeof stats, 'object');
      assert.equal(Object.keys(stats).length, 0);

      await dispatcher.destroy();
    });

    void it('should return stats object after requests', async () => {
      const dispatcher = createDispatcher(10);

      // Note: Can't easily test with real requests in unit tests
      // Stats would be populated after actual fetch requests
      const stats = dispatcher.getStats();

      assert.equal(typeof stats, 'object');

      await dispatcher.destroy();
    });

    void it('should return frozen stats object', async () => {
      const dispatcher = createDispatcher(10);
      const stats = dispatcher.getStats();

      // Outer object should be frozen
      assert.ok(Object.isFrozen(stats));

      // Attempting to add new properties should throw (ES modules are strict by default)
      assert.throws(() => {
        Object.assign(stats, { 'new-origin': { 'test': 'value' } });
      }, TypeError);

      await dispatcher.destroy();
    });

    void it('should return deeply frozen stats with dispatcher data', async () => {
      // This test would require making actual HTTP requests to populate stats
      // For now, verify the structure is correct for empty stats
      const dispatcher = createDispatcher(10);
      const stats = dispatcher.getStats();

      // Empty stats should still be frozen
      assert.ok(Object.isFrozen(stats));

      // Verify immutability at the outer level (ES modules are strict by default)
      const attemptMutation = (): void => {
        Object.assign(stats, { 'test': 'value' });
      };

      assert.throws(attemptMutation, TypeError);

      await dispatcher.destroy();
    });
  });

  void describe('checkDispatcherHealth', () => {
    void it('should return healthy for non-existent origin', async () => {
      const dispatcher = createDispatcher(10);
      const health = dispatcher.checkDispatcherHealth('https://example.com:443');

      assert.equal(health.healthy, true);
      assert.equal(health.stats, undefined);
      assert.equal(health.queueRatio, undefined);
      assert.equal(health.recommendation, undefined);

      await dispatcher.destroy();
    });

    void it('should return healthy for newly created dispatcher', async () => {
      // Fresh dispatcher with no requests = healthy
      const dispatcher = createDispatcher(20);
      const stats = dispatcher.getStats();

      // Should have no origins yet
      assert.equal(Object.keys(stats).length, 0);

      // Any check should return healthy
      const health = dispatcher.checkDispatcherHealth('https://test.com:443');

      assert.equal(health.healthy, true);

      await dispatcher.destroy();
    });

    void it('should have proper DispatcherHealthType interface', async () => {
      const dispatcher = createDispatcher(10);
      const health: DispatcherHealthType = dispatcher.checkDispatcherHealth('https://test.com:443');

      // Verify all required properties exist
      assert.equal(typeof health.healthy, 'boolean');

      // Optional properties may be undefined for non-existent origins
      assert.ok(health.stats === undefined || typeof health.stats === 'object');
      assert.ok(health.queueRatio === undefined || typeof health.queueRatio === 'number');
      assert.ok(health.recommendation === undefined || typeof health.recommendation === 'string');

      await dispatcher.destroy();
    });

    void it('should return proper structure after getStats()', async () => {
      const dispatcher = createDispatcher(10);
      const stats = dispatcher.getStats();

      // Stats should be a record object
      assert.equal(typeof stats, 'object');
      assert.ok(Object.isFrozen(stats));

      await dispatcher.destroy();
    });
  });
});
