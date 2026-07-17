/** Named async health-check registry with worst-status-wins aggregation */

import { HookInvoker } from '@studnicky/errors';

import type { HealthCheckOptionsEntity } from './entities/HealthCheckOptionsEntity.js';
import type { HealthCheckResultType } from './types/HealthCheckResultType.js';
import type { HealthCheckType } from './types/HealthCheckType.js';
import type { HealthEvaluationType } from './types/HealthEvaluationType.js';
import type { HealthStatusType } from './types/HealthStatusType.js';
import type { HookErrorEntryType } from './types/HookErrorEntryType.js';

type HealthCheckOptionsType = HealthCheckOptionsEntity.Type;

// json-schema-uninexpressible: 'check' is a function type (HealthCheckType), not representable in JSON Schema
type HealthCheckEntryType = {
  readonly 'check': HealthCheckType;
  readonly 'timeoutMs': number | undefined;
};

/**
 * Delegates hook-error handling back to the owning `HealthRegistry`'s
 * `#hookErrors`. Hoisted to module scope so V8 compiles this class once
 * rather than per `HealthRegistry` instantiation.
 */
class HealthRegistryHookInvoker extends HookInvoker {
  constructor(private readonly onFailure: (hookName: string, cause: unknown) => void) {
    super();
  }

  protected override onHookError<T>(hookName: string, cause: unknown): T {
    this.onFailure(hookName, cause);
    return undefined as T;
  }
}

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
 * This class performs NO observability of its own — it exposes protected lifecycle hooks
 * that a consumer overrides to add logging, timing, or metrics. A hook that throws or rejects
 * does not corrupt the registry or abort the caller: the failure is recorded (see
 * `hookErrorCount`/`getHookErrors()`) instead of propagating.
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
  readonly #hookErrors: HookErrorEntryType[] = [];
  protected readonly hooks: HookInvoker;

  protected constructor() {
    this.hooks = new HealthRegistryHookInvoker((hookName, cause) => {
      this.#hookErrors.push({ 'cause': cause, 'hookName': hookName });
    });
  }

  /** Count of hook failures recorded by `onHookError` since construction. */
  get hookErrorCount(): number {
    const result = this.#hookErrors.length;
    return result;
  }

  /** Returns a defensive copy of every hook failure recorded since construction. */
  getHookErrors(): readonly HookErrorEntryType[] {
    const result = [...this.#hookErrors];
    return result;
  }

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
      'timeoutMs': options?.timeoutMs
    };
    this.#registry.set(name, entry);
    this.hooks.invoke('onCheckRegistered', () => {
      const result = this.onCheckRegistered(name);
      return result;
    });
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
    this.hooks.invoke('onAggregate', () => {
      const result = this.onAggregate(overall, results);
      return result;
    });

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

    this.hooks.invoke('onCheckResult', () => {
      const hookResult = this.onCheckResult(name, result.status, result.metadata);
      return hookResult;
    });
    return result;
  }

  async #runWithTimeout(name: string, check: HealthCheckType, timeoutMs: number): Promise<HealthCheckResultType> {
    const checkPromise = check();
    // A check that loses the race may still reject later; swallow so it never
    // surfaces as an unhandled rejection once the timeout branch has already settled.
    checkPromise.catch(() => {});

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<HealthCheckResultType>((resolve) => {
      timer = setTimeout(() => {
        this.hooks.invoke('onCheckTimeout', () => {
          const result = this.onCheckTimeout(name, timeoutMs);
          return result;
        });
        resolve({ 'metadata': { 'reason': 'timeout', 'timeoutMs': timeoutMs }, 'status': 'unhealthy' });
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([checkPromise, timeoutPromise]);
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. The bare class does NO observability;
  // override in a subclass to add logging/tracing/metrics. A throwing override
  // is recorded via `onHookError` rather than propagated; see class doc comment.
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
