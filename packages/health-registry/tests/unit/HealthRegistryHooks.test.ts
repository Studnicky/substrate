import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { HealthRegistry } from '../../src/HealthRegistry.js';
import type { HealthCheckResultType } from '../../src/types/HealthCheckResultType.js';
import type { HealthStatusType } from '../../src/types/HealthStatusType.js';

class ObservedRegistry extends HealthRegistry {
  static override create(): ObservedRegistry {
    return new ObservedRegistry();
  }

  readonly registeredCalls: string[] = [];
  readonly resultCalls: { 'name': string; 'status': HealthStatusType; 'metadata': unknown }[] = [];
  readonly aggregateCalls: { 'overall': HealthStatusType; 'size': number }[] = [];
  readonly timeoutCalls: { 'name': string; 'timeoutMs': number }[] = [];

  protected override onCheckRegistered(name: string): void {
    this.registeredCalls.push(name);
  }

  protected override onCheckResult(name: string, status: HealthStatusType, metadata?: unknown): void {
    this.resultCalls.push({ 'name': name, 'status': status, 'metadata': metadata });
  }

  protected override onAggregate(overall: HealthStatusType, results: ReadonlyMap<string, HealthCheckResultType>): void {
    this.aggregateCalls.push({ 'overall': overall, 'size': results.size });
  }

  protected override onCheckTimeout(name: string, timeoutMs: number): void {
    this.timeoutCalls.push({ 'name': name, 'timeoutMs': timeoutMs });
  }
}

describe('HealthRegistry lifecycle hooks', () => {
  let registry: ObservedRegistry;

  beforeEach(() => {
    registry = ObservedRegistry.create();
  });

  it('onCheckRegistered fires once per registration', () => {
    registry.register('a', async () => ({ 'status': 'healthy' }));
    registry.register('b', async () => ({ 'status': 'healthy' }));

    assert.deepEqual(registry.registeredCalls, ['a', 'b']);
  });

  it('onCheckResult fires once per check per evaluate() call', async () => {
    registry.register('a', async () => ({ 'status': 'healthy' }));
    registry.register('b', async () => ({ 'status': 'degraded', 'metadata': { 'reason': 'slow' } }));

    await registry.evaluate();

    assert.equal(registry.resultCalls.length, 2);
    const byName = new Map(registry.resultCalls.map((call) => [call.name, call]));
    assert.equal(byName.get('a')?.status, 'healthy');
    assert.equal(byName.get('b')?.status, 'degraded');
    assert.deepEqual(byName.get('b')?.metadata, { 'reason': 'slow' });
  });

  it('onCheckResult fires for a rejecting check with the error as metadata', async () => {
    registry.register('boom', async () => {
      throw new Error('nope');
    });

    await registry.evaluate();

    assert.equal(registry.resultCalls.length, 1);
    assert.equal(registry.resultCalls[0]!.status, 'unhealthy');
    assert.ok(registry.resultCalls[0]!.metadata !== undefined);
  });

  it('onCheckTimeout fires in addition to onCheckResult when a check exceeds timeoutMs', async () => {
    registry.register('slow', async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { 'status': 'healthy' as const };
    }, { 'timeoutMs': 10 });

    await registry.evaluate();

    assert.equal(registry.timeoutCalls.length, 1);
    assert.equal(registry.timeoutCalls[0]!.name, 'slow');
    assert.equal(registry.timeoutCalls[0]!.timeoutMs, 10);

    assert.equal(registry.resultCalls.length, 1);
    assert.equal(registry.resultCalls[0]!.status, 'unhealthy');
  });

  it('onCheckTimeout does not fire when a check resolves well within its timeoutMs, even after waiting past the timeout window', async () => {
    registry.register('fast', async () => ({ 'status': 'healthy' as const }), { 'timeoutMs': 500 });

    await registry.evaluate();

    // Wait past the configured timeout window to catch a spuriously-lingering timer.
    await new Promise((resolve) => setTimeout(resolve, 600));

    assert.equal(registry.timeoutCalls.length, 0);
    assert.equal(registry.resultCalls.length, 1);
    assert.equal(registry.resultCalls[0]!.status, 'healthy');
  });

  it('onAggregate fires exactly once per evaluate() call, after all checks settle', async () => {
    registry.register('a', async () => ({ 'status': 'healthy' }));
    registry.register('b', async () => ({ 'status': 'unhealthy' }));

    await registry.evaluate();

    assert.equal(registry.aggregateCalls.length, 1);
    assert.equal(registry.aggregateCalls[0]!.overall, 'unhealthy');
    assert.equal(registry.aggregateCalls[0]!.size, 2);

    await registry.evaluate();
    assert.equal(registry.aggregateCalls.length, 2);
  });

  it('hooks fire in correct order across register -> evaluate', async () => {
    const order: string[] = [];

    class OrderedRegistry extends HealthRegistry {
      static override create(): OrderedRegistry {
        return new OrderedRegistry();
      }

      protected override onCheckRegistered(_name: string): void { order.push('registered'); }
      protected override onCheckResult(_name: string): void { order.push('result'); }
      protected override onAggregate(): void { order.push('aggregate'); }
    }

    const ordered = OrderedRegistry.create();
    ordered.register('a', async () => ({ 'status': 'healthy' }));
    await ordered.evaluate();

    assert.deepEqual(order, ['registered', 'result', 'aggregate']);
  });

  it('a throwing onCheckResult hook does not replace evaluate() output', async () => {
    class ThrowingResultRegistry extends HealthRegistry {
      static override create(): ThrowingResultRegistry {
        return new ThrowingResultRegistry();
      }

      protected override onCheckResult(): void {
        throw new Error('hook boom');
      }
    }

    const throwing = ThrowingResultRegistry.create();
    throwing.register('a', async () => ({ 'status': 'healthy' as const }));

    const evaluation = await throwing.evaluate();
    assert.equal(evaluation.status, 'healthy');
    assert.equal(evaluation.results.get('a')?.status, 'healthy');
  });

  it('a throwing onAggregate hook does not replace the aggregated evaluation result', async () => {
    class ThrowingAggregateRegistry extends HealthRegistry {
      static override create(): ThrowingAggregateRegistry {
        return new ThrowingAggregateRegistry();
      }

      protected override onAggregate(): void {
        throw new Error('hook boom');
      }
    }

    const throwing = ThrowingAggregateRegistry.create();
    throwing.register('a', async () => ({ 'status': 'degraded' as const }));

    const evaluation = await throwing.evaluate();
    assert.equal(evaluation.status, 'degraded');
    assert.equal(evaluation.results.get('a')?.status, 'degraded');
  });

  it('an async onAggregate override that rejects is routed through getHookErrors() without an unhandled rejection', async () => {
    class AsyncRejectingAggregateRegistry extends HealthRegistry {
      static override create(): AsyncRejectingAggregateRegistry {
        return new AsyncRejectingAggregateRegistry();
      }

      protected override async onAggregate(): Promise<void> {
        await Promise.resolve();
        throw new Error('async aggregate boom');
      }
    }

    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const asyncRegistry = AsyncRejectingAggregateRegistry.create();
      asyncRegistry.register('a', async () => ({ 'status': 'healthy' as const }));

      const evaluation = await asyncRegistry.evaluate();
      assert.equal(evaluation.status, 'healthy');

      await new Promise((resolve) => setTimeout(resolve, 10));
      await new Promise((resolve) => setImmediate(resolve));

      assert.equal(rejectionEvents.length, 0);
      assert.equal(asyncRegistry.hookErrorCount, 1);
      assert.equal(asyncRegistry.getHookErrors()[0]?.hookName, 'onAggregate');
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  });
});
