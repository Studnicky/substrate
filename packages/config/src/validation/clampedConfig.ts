/**
 * Configuration clamping utility.
 *
 * Soft-correction sibling to `ConfigValidation`'s hard-fail assertions: given a
 * flat config object and a declarative table of `{min, max, reason}` per
 * numeric field, returns a NEW object with out-of-range numeric fields clamped
 * into range instead of throwing.
 *
 * Subclass and `static override onClamp` to observe or log clamp events; the
 * default hook is a no-op.
 */

import { HookInvocationError } from '@studnicky/errors';

import type { ClampEventEntity } from '../entities/ClampEventEntity.js';
import type { ClampRuleEntity } from '../entities/ClampRuleEntity.js';

export class ClampedConfig {
  /**
   * Invokes the `onClamp` lifecycle hook, safely handling both a synchronous
   * and an asynchronous result.
   *
   * `apply` is a synchronous, public, static hot-path API — it cannot be made
   * `async` without a breaking cascade through every caller across the
   * monorepo — so this stays sync and calls `onClamp` directly, never
   * `await`ing at the call site, rather than extending `HookInvoking` (whose
   * `invokeHook` is always `async` and uses instance methods). This toolkit
   * accepts arbitrary, unknown `onClamp` overrides from external consumers; a
   * hook typed to return `void` structurally accepts an `async` override in
   * TypeScript (the language's void-return leniency), so nothing here can
   * assume the hook stays synchronous just because its declared signature
   * says so.
   *
   * A synchronous throw surfaces immediately, exactly as before: routed
   * through `onHookError`, whose default throws a `HookInvocationError`
   * carrying the hook name and the original cause. If `onClamp`'s result
   * turns out to be thenable (an unexpectedly-async override), it is chained
   * through a guaranteed `.catch` that routes the eventual rejection to
   * `onHookError` and can never surface as an unhandled promise rejection —
   * there is simply no way to propagate that outcome back through `apply`'s
   * own synchronous return, since that is a fundamental limit of calling
   * asynchronous code from a synchronous call site, not something this
   * safety net can escape. It exists purely so a misbehaving override can
   * never crash the process.
   */
  protected static invokeHook(event: ClampEventEntity.Type): void {
    try {
      const result = this.onClamp(event);
      if (!ClampedConfig.#isThenable(result)) {
        return;
      }
      const guarded = ClampedConfig.#awaitAndRoute(this, result);
      // Backstop only — a failure is already routed through onHookError
      // inside #awaitAndRoute; this second, empty catch exists purely so an
      // unawaited hook result never surfaces as an unhandledRejection.
      guarded.catch(() => { });
    } catch (cause) {
      this.onHookError(cause);
    }
  }

  static async #awaitAndRoute(ctor: typeof ClampedConfig, pending: unknown): Promise<void> {
    try {
      await pending;
    } catch (cause) {
      ctor.onHookError(cause);
    }
  }

  static #isThenable(value: unknown): value is PromiseLike<unknown> {
    return (typeof value === 'object' || typeof value === 'function') && value !== null && typeof (value as PromiseLike<unknown>).then === 'function';
  }

  /**
   * Handles a failure raised by the `onClamp` hook invoked via `invokeHook`.
   * The base implementation always throws a `HookInvocationError`.
   *
   * Fire-point: called when `onClamp` throws, rejects, or (for an
   * unexpectedly async `onClamp` override the synchronous call site never
   * awaits) settles as a rejection some time after `invokeHook` already
   * returned. Never logs internally.
   */
  protected static onHookError(cause: unknown): void {
    throw new HookInvocationError('onClamp', cause);
  }

  /**
   * Extension seam — called by `apply` for every field that gets clamped.
   * Subclasses may `static override` to observe or log clamp events instead.
   *
   * Fire-point: called once per clamped field, after the value has been
   * computed but before it is written into the returned object. Default is a
   * no-op; no dependency on any logging package.
   */
  protected static onClamp(_event: ClampEventEntity.Type): void {
    // no-op default — subclasses override to observe clamp events
  }

  /**
   * Return a new object with out-of-range numeric fields clamped into range.
   *
   * For each key present in both `rules` and `config`: if the value is a
   * number and falls outside `[min, max]`, the returned object carries the
   * clamped value and `onClamp` fires. Fields that are not numeric, not
   * present in `config`, or already in-range are copied through unchanged.
   * The input object is never mutated.
   */
  public static apply<T extends Record<string, unknown>>(
    config: T,
    rules: Readonly<Record<string, ClampRuleEntity.Type>>
  ): T {
    const result = { ...config };

    for (const [field, rule] of Object.entries(rules)) {
      if (!(field in config)) {
        continue;
      }
      const raw = config[field];
      if (typeof raw !== 'number') {
        continue;
      }
      if (raw >= rule.min && raw <= rule.max) {
        continue;
      }
      const clamped = Math.min(Math.max(raw, rule.min), rule.max);
      (result as Record<string, unknown>)[field] = clamped;
      this.invokeHook({ 'clamped': clamped, 'field': field, 'raw': raw, 'reason': rule.reason });
    }

    return result;
  }
}
