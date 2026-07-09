/** Named async health-check registry with worst-status-wins aggregation */

import { Signal } from '@studnicky/signal';

import type { HealthCheckOptionsType } from './types/HealthCheckOptionsType.js';
import type { HealthCheckResultType } from './types/HealthCheckResultType.js';
import type { HealthCheckType } from './types/HealthCheckType.js';
import type { HealthEvaluationType } from './types/HealthEvaluationType.js';
import type { HealthStatusType } from './types/HealthStatusType.js';

type HealthCheckEntryType = {
  readonly 'check': HealthCheckType;
  readonly 'timeoutMs'?: number;
};

/**
 * Registers named async health checks and aggregates them into one overall status.
 *
 * Each registered check resolves to `{ status, metadata? }`. `evaluate()` runs every
 * registered check in parallel via `Promise.allSettled` — a rejecting check, or one that
 * exceeds its configured `timeoutMs`, is folded into the results as `'unhealthy'` rather
 * than crashing the evaluation of the other checks. The overall status is worst-status-wins:
 * any `'unhealthy'` check makes the overall status `'unhealthy'`, else any `'degraded'` check
 * makes it `'degraded'`, else `'healthy'`. An empty registry evaluates to `'healthy'`.
 *
 * `HealthRegistry` owns only the registry-and-aggregate logic — no HTTP endpoint wiring, no
 * Kubernetes liveness/readiness distinction. Wire `evaluate()` into a route or probe in the
 * consuming application.
 *
 * @example
 * ```typescript
 * const registry = HealthRegistry.create();
 *
 * registry.register('database', async () => {
 *   await db.ping();
 *   return { status: 'healthy' };
 * }, { timeoutMs: 500 });
 *
 * const { status, results } = await registry.evaluate();
 * ```
 */
export class HealthRegistry {
  static create(): HealthRegistry {
    return new HealthRegistry();
  }

  readonly #registry = new Map<string, HealthCheckEntryType>();
  readonly #signal = Signal.create();

  protected constructor() {}

  /**
   * Registers a named check function, replacing any existing check under the same name.
   *
   * @param name - Unique check name
   * @param check - Async function resolving to a status and optional metadata
   * @param options - Per-check options; `timeoutMs` bounds how long the check may run
   */
  register(name: string, check: HealthCheckType, options?: HealthCheckOptionsType): void {
    const entry: HealthCheckEntryType = {
      'check': check,
      ...(options?.timeoutMs !== undefined ? { 'timeoutMs': options.timeoutMs } : {})
    };
    this.#registry.set(name, entry);
    this.onCheckRegistered(name);
  }

  /** Removes a named check. No-op if the name was never registered. */
  unregister(name: string): void {
    this.#registry.delete(name);
  }

  has(name: string): boolean {
    const result = this.#registry.has(name);
    return result;
  }

  list(): readonly string[] {
    const keys = this.#registry.keys();
    return [...keys];
  }

  /**
   * Runs every registered check in parallel and aggregates the results.
   *
   * @returns The worst-status-wins overall status and a map of every check's own result
   */
  async evaluate(): Promise<HealthEvaluationType> {
    const entries = [...this.#registry.entries()];

    const settled = await Promise.allSettled(
      entries.map(([name, entry]) => { const result = this.#runCheck(name, entry); return result; })
    );

    const results = new Map<string, HealthCheckResultType>();
    entries.forEach(([name], index) => {
      const outcome = settled[index]!;
      const result: HealthCheckResultType = outcome.status === 'fulfilled'
        ? outcome.value
        : { 'metadata': { 'error': outcome.reason as unknown }, 'status': 'unhealthy' };
      results.set(name, result);
    });

    const overall = HealthRegistry.#aggregate(results);
    this.onAggregate(overall, results);

    return { 'results': results, 'status': overall };
  }

  static #aggregate(results: ReadonlyMap<string, HealthCheckResultType>): HealthStatusType {
    let hasDegraded = false;
    for (const result of results.values()) {
      if (result.status === 'unhealthy') {
        return 'unhealthy';
      }
      if (result.status === 'degraded') {
        hasDegraded = true;
      }
    }
    return hasDegraded ? 'degraded' : 'healthy';
  }

  async #runCheck(name: string, entry: HealthCheckEntryType): Promise<HealthCheckResultType> {
    let result: HealthCheckResultType;

    try {
      result = entry.timeoutMs !== undefined
        ? await this.#runWithTimeout(name, entry.check, entry.timeoutMs)
        : await entry.check();
    } catch (error) {
      result = { 'metadata': { 'error': error }, 'status': 'unhealthy' };
    }

    this.onCheckResult(name, result.status, result.metadata);
    return result;
  }

  async #runWithTimeout(name: string, check: HealthCheckType, timeoutMs: number): Promise<HealthCheckResultType> {
    const signal = this.#signal.timeout(timeoutMs);

    const checkPromise = check();
    // A check that loses the race may still reject later; swallow so it never
    // surfaces as an unhandled rejection once the timeout branch has already settled.
    checkPromise.catch(() => {});

    const timeoutPromise = new Promise<HealthCheckResultType>((resolve) => {
      signal.addEventListener('abort', () => {
        this.onCheckTimeout(name, timeoutMs);
        resolve({ 'metadata': { 'reason': 'timeout', 'timeoutMs': timeoutMs }, 'status': 'unhealthy' });
      }, { 'once': true });
    });

    const result = await Promise.race([checkPromise, timeoutPromise]);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. The bare class does NO observability;
  // override in a subclass to add logging/tracing/metrics.
  // Overrides must not throw or block.
  // ---------------------------------------------------------------------------

  /** Fires after a check is registered (or replaces an existing registration under the same name). */
  protected onCheckRegistered(_name: string): void {}

  /** Fires once per check as it settles during `evaluate()` — success, rejection, or timeout. */
  protected onCheckResult(_name: string, _status: HealthStatusType, _metadata?: unknown): void {}

  /** Fires once per `evaluate()` call, after every registered check has settled. */
  protected onAggregate(_overall: HealthStatusType, _results: ReadonlyMap<string, HealthCheckResultType>): void {}

  /** Fires when a check exceeds its configured `timeoutMs`, in addition to `onCheckResult`. */
  protected onCheckTimeout(_name: string, _timeoutMs: number): void {}
}
