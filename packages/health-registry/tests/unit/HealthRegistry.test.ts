import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { HealthRegistry } from '../../src/HealthRegistry.js';

const healthy = async () => ({ 'status': 'healthy' as const });
const degraded = async () => ({ 'status': 'degraded' as const, 'metadata': { 'reason': 'slow' } });
const unhealthy = async () => ({ 'status': 'unhealthy' as const, 'metadata': { 'reason': 'down' } });

describe('HealthRegistry', () => {
  let registry: HealthRegistry;

  beforeEach(() => {
    registry = HealthRegistry.create();
  });

  it('empty registry evaluates to healthy with an empty results map', async () => {
    const { status, results } = await registry.evaluate();

    assert.equal(status, 'healthy');
    assert.equal(results.size, 0);
  });

  it('all-healthy registry evaluates to healthy', async () => {
    registry.register('a', healthy);
    registry.register('b', healthy);

    const { status, results } = await registry.evaluate();

    assert.equal(status, 'healthy');
    assert.equal(results.get('a')?.status, 'healthy');
    assert.equal(results.get('b')?.status, 'healthy');
  });

  it('one degraded check makes the overall degraded while others keep their own status', async () => {
    registry.register('a', healthy);
    registry.register('b', degraded);

    const { status, results } = await registry.evaluate();

    assert.equal(status, 'degraded');
    assert.equal(results.get('a')?.status, 'healthy');
    assert.equal(results.get('b')?.status, 'degraded');
  });

  it('one unhealthy check makes the overall unhealthy even if others are healthy', async () => {
    registry.register('a', healthy);
    registry.register('b', unhealthy);
    registry.register('c', degraded);

    const { status, results } = await registry.evaluate();

    assert.equal(status, 'unhealthy');
    assert.equal(results.get('a')?.status, 'healthy');
    assert.equal(results.get('b')?.status, 'unhealthy');
    assert.equal(results.get('c')?.status, 'degraded');
  });

  it('a rejecting check is treated as unhealthy and does not crash evaluate() for other checks', async () => {
    registry.register('rejecting', async () => {
      throw new Error('boom');
    });
    registry.register('ok', healthy);

    const { status, results } = await registry.evaluate();

    assert.equal(status, 'unhealthy');
    assert.equal(results.size, 2);
    assert.equal(results.get('rejecting')?.status, 'unhealthy');
    assert.ok(results.get('rejecting')?.metadata !== undefined);
    assert.equal(results.get('ok')?.status, 'healthy');
  });

  it('a check exceeding its configured timeoutMs is treated as unhealthy', async () => {
    registry.register('slow', async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { 'status': 'healthy' as const };
    }, { 'timeoutMs': 10 });

    const { status, results } = await registry.evaluate();

    assert.equal(status, 'unhealthy');
    assert.equal(results.get('slow')?.status, 'unhealthy');
    assert.ok(results.get('slow')?.metadata !== undefined);
  });

  it('unregister removes a check so it no longer participates in evaluate()', async () => {
    registry.register('a', healthy);
    registry.register('b', unhealthy);
    registry.unregister('b');

    const { status, results } = await registry.evaluate();

    assert.equal(status, 'healthy');
    assert.equal(results.size, 1);
    assert.equal(results.has('b'), false);
  });

  it('has() and list() reflect the current registration state', () => {
    assert.equal(registry.has('a'), false);
    registry.register('a', healthy);
    assert.equal(registry.has('a'), true);
    assert.deepEqual(registry.list(), ['a']);

    registry.unregister('a');
    assert.equal(registry.has('a'), false);
    assert.deepEqual(registry.list(), []);
  });

  it('re-registering the same name replaces the previous check', async () => {
    registry.register('a', unhealthy);
    registry.register('a', healthy);

    const { status } = await registry.evaluate();

    assert.equal(status, 'healthy');
  });
});
