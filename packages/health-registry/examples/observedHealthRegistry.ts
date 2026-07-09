/** observedHealthRegistry — override the lifecycle hooks to collect telemetry. Run: npx tsx examples/observedHealthRegistry.ts */

import assert from 'node:assert/strict';

// #region usage
import type { HealthCheckResultType, HealthStatusType } from '../src/index.js';

import { HealthRegistry } from '../src/index.js';

class TelemetryHealthRegistry extends HealthRegistry {
  static override create(): TelemetryHealthRegistry {
    return new TelemetryHealthRegistry();
  }

  readonly registeredChecks: string[] = [];
  readonly checkResults: { 'name': string; 'status': HealthStatusType }[] = [];
  readonly timeouts: { 'name': string; 'timeoutMs': number }[] = [];

  protected override onCheckRegistered(name: string): void {
    console.log(`[health] registered '${name}'`);
    this.registeredChecks.push(name);
  }

  protected override onCheckResult(name: string, status: HealthStatusType, metadata?: unknown): void {
    console.log(`[health] '${name}' -> ${status}${metadata !== undefined ? ` (${JSON.stringify(metadata)})` : ''}`);
    this.checkResults.push({ 'name': name, 'status': status });
  }

  protected override onCheckTimeout(name: string, timeoutMs: number): void {
    console.log(`[health] '${name}' exceeded its ${timeoutMs}ms timeout`);
    this.timeouts.push({ 'name': name, 'timeoutMs': timeoutMs });
  }

  protected override onAggregate(overall: HealthStatusType, results: ReadonlyMap<string, HealthCheckResultType>): void {
    console.log(`[health] overall: ${overall} (${String(results.size)} checks)`);
  }
}

const registry = TelemetryHealthRegistry.create();

registry.register('database', () => {return { 'status': 'healthy' };});

registry.register('cache', () => {return {
  'metadata': { 'hitRate': 0.42 },
  'status': 'degraded'
};});

registry.register('downstream-api', async () => {
  await new Promise((resolve) => { const result = setTimeout(resolve, 200); return result; });
  return { 'status': 'healthy' };
}, { 'timeoutMs': 20 });

const evaluation = await registry.evaluate();

console.log('Overall status:', evaluation.status);
console.log('Per-check results:', Object.fromEntries(evaluation.results));
// #endregion usage

// worst-status-wins: the timed-out 'downstream-api' check makes the overall status unhealthy
assert.equal(evaluation.status, 'unhealthy');
assert.equal(evaluation.results.size, 3);
assert.equal(evaluation.results.get('database')?.status, 'healthy');
assert.equal(evaluation.results.get('cache')?.status, 'degraded');
assert.equal(evaluation.results.get('downstream-api')?.status, 'unhealthy');

// onCheckRegistered fired once per registration, in registration order
assert.deepEqual(registry.registeredChecks, ['database', 'cache', 'downstream-api']);

// onCheckResult fired once per check
assert.equal(registry.checkResults.length, 3);

// onCheckTimeout fired only for the check that exceeded its timeoutMs
assert.equal(registry.timeouts.length, 1);
assert.equal(registry.timeouts[0]!.name, 'downstream-api');

console.log('observedHealthRegistry: all assertions passed');
